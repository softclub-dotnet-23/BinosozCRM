using System.Text.Json;
using Api.Middleware;
using Domain.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class ConcurrencyConflictTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Stale_work_order_transition_raises_a_real_optimistic_concurrency_exception()
    {
        var (owner, workOrderId) = await SeedWorkOrderAsync();
        await using var firstContext = fixture.CreateDbContext(owner);
        await using var staleContext = fixture.CreateDbContext(owner);

        var first = await firstContext.WorkOrders.SingleAsync(w => w.Id == workOrderId);
        var stale = await staleContext.WorkOrders.SingleAsync(w => w.Id == workOrderId);

        first.Assign(DateOnly.FromDateTime(DateTime.UtcNow));
        await firstContext.SaveChangesAsync(CancellationToken.None);

        stale.Assign(DateOnly.FromDateTime(DateTime.UtcNow));
        var save = () => staleContext.SaveChangesAsync(CancellationToken.None);

        await save.Should().ThrowAsync<DbUpdateConcurrencyException>();
    }

    [Fact]
    public async Task Concurrency_exception_is_returned_as_standard_409_error_envelope()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        httpContext.TraceIdentifier = "concurrency-test";
        var middleware = new ExceptionHandlingMiddleware(
            _ => Task.FromException(new DbUpdateConcurrencyException("stale xmin")),
            NullLogger<ExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(httpContext);

        httpContext.Response.StatusCode.Should().Be(StatusCodes.Status409Conflict);
        httpContext.Response.Body.Position = 0;
        using var response = await JsonDocument.ParseAsync(httpContext.Response.Body);
        response.RootElement.GetProperty("error").GetProperty("code").GetString().Should().Be("CONCURRENCY_CONFLICT");
        response.RootElement.GetProperty("error").GetProperty("traceId").GetString().Should().Be("concurrency-test");
    }

    private async Task<(FixedCurrentUserService Owner, Guid WorkOrderId)> SeedWorkOrderAsync()
    {
        var companyId = Guid.NewGuid();
        var ownerUser = User.Create(companyId, "Owner", $"+992{Random.Shared.NextInt64(100000000, 999999999)}", "hash", Domain.Enums.Role.Owner);
        var company = Company.Create(companyId, $"Concurrency Co {companyId}");
        var customer = Customer.Create(companyId, "Customer");
        var constructionObject = ConstructionObject.Create(companyId, "Object", customer.Id);
        var brigade = Brigade.Create(companyId, "Brigade");
        var order = WorkOrder.Create(companyId, "BR-CONCURRENCY", constructionObject.Id, brigade.Id, "Order", "m2", 1m, 1m, ownerUser.Id);

        await using var context = fixture.CreateDbContext();
        context.AddRange(company, ownerUser, customer, constructionObject, brigade, order);
        await context.SaveChangesAsync(CancellationToken.None);

        return (new FixedCurrentUserService(companyId, ownerUser.Id, Domain.Enums.Role.Owner), order.Id);
    }
}
