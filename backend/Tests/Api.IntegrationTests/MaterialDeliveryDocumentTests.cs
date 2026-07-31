using Application.Materials;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

// Frontend-integration gap (2026-07-31): the UI's "receipt" is one document
// with several material lines; MaterialDelivery is one line per row. This
// bulk path (+ MaterialDelivery.DocumentId, migration
// 20260731124052_AddDocumentIdToMaterialDeliveries) creates every line in
// one transaction sharing a generated DocumentId, without touching the
// pre-existing single-item path at all.
[Collection(PostgresCollection.Name)]
public sealed class MaterialDeliveryDocumentTests(PostgresFixture fixture)
{
    private async Task<(FixedCurrentUserService Owner, Guid ObjectId)> SeedAsync()
    {
        var companyId = Guid.NewGuid();
        var owner = new FixedCurrentUserService(companyId, Guid.NewGuid(), Role.Owner);
        await using var context = fixture.CreateDbContext(owner);

        var company = Company.Create(companyId, $"Delivery Document Test Co {companyId}");
        var customer = Customer.Create(companyId, "Acme");
        var constructionObject = ConstructionObject.Create(companyId, "Object A", customer.Id);

        context.Companies.Add(company);
        context.Customers.Add(customer);
        context.ConstructionObjects.Add(constructionObject);
        await context.SaveChangesAsync(CancellationToken.None);

        return (owner, constructionObject.Id);
    }

    private static MaterialDeliveryDocumentLineInput Line(string name = "Cement", decimal qty = 10m, decimal unitCost = 50m) =>
        new(name, "bag", qty, unitCost);

    [Fact]
    public async Task Bulk_create_shares_one_DocumentId_across_all_lines()
    {
        var (owner, objectId) = await SeedAsync();
        var items = new[] { Line("Cement", 10m, 50m), Line("Sand", 5m, 20m), Line("Rebar", 100m, 3m) };

        await using var context = fixture.CreateDbContext(owner);
        var result = await new CreateMaterialDeliveryDocumentCommandHandler(context, owner)
            .Handle(new CreateMaterialDeliveryDocumentCommand(objectId, "ООО Стройматериалы", items), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().HaveCount(3);
        result.Value.Lines.Select(l => l.DocumentId).Should().AllBeEquivalentTo(result.Value.DocumentId);
        result.Value.Lines.Select(l => l.ObjectId).Should().AllBeEquivalentTo(objectId);

        await using var verifyContext = fixture.CreateDbContext();
        var persisted = await verifyContext.MaterialDeliveries.IgnoreQueryFilters()
            .Where(d => d.DocumentId == result.Value.DocumentId)
            .ToListAsync(CancellationToken.None);
        persisted.Should().HaveCount(3);
    }

    [Fact]
    public async Task Empty_items_list_is_rejected()
    {
        var (owner, objectId) = await SeedAsync();
        var validator = new CreateMaterialDeliveryDocumentCommandValidator();

        var result = validator.Validate(new CreateMaterialDeliveryDocumentCommand(objectId, null, []));

        result.IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(-1, 10)]
    [InlineData(5, -1)]
    public async Task Invalid_line_quantities_or_cost_are_rejected(decimal qty, decimal unitCost)
    {
        var (_, objectId) = await SeedAsync();
        var validator = new CreateMaterialDeliveryDocumentCommandValidator();

        var result = validator.Validate(new CreateMaterialDeliveryDocumentCommand(objectId, null, [Line("Cement", qty, unitCost)]));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Unknown_object_is_rejected()
    {
        var (owner, _) = await SeedAsync();
        await using var context = fixture.CreateDbContext(owner);

        var result = await new CreateMaterialDeliveryDocumentCommandHandler(context, owner)
            .Handle(new CreateMaterialDeliveryDocumentCommand(Guid.NewGuid(), null, [Line()]), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("OBJECT_NOT_FOUND");
    }

    [Fact]
    public async Task Existing_single_item_endpoint_still_leaves_DocumentId_null()
    {
        var (owner, objectId) = await SeedAsync();
        await using var context = fixture.CreateDbContext(owner);

        var result = await new CreateMaterialDeliveryCommandHandler(context, owner)
            .Handle(new CreateMaterialDeliveryCommand(objectId, null, "Cement", "bag", 10m, 50m, null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.DocumentId.Should().BeNull();
    }
}
