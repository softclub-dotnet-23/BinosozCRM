using Application.Payroll;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class PayrollEntryUpsertTests(PostgresFixture fixture)
{
    private static readonly FixedBusinessTimeProvider BusinessTime = new(new DateTimeOffset(2026, 8, 10, 12, 0, 0, TimeSpan.Zero));
    private static readonly DateOnly JulyStart = new(2026, 7, 1);
    private static readonly DateOnly JulyEnd = new(2026, 7, 31);
    private static readonly DateOnly AugustStart = new(2026, 8, 1);
    private static readonly DateOnly AugustEnd = new(2026, 8, 31);

    [Fact]
    public async Task Exact_Draft_period_recalculates_the_existing_entry()
    {
        var (company, worker, accountant) = await SeedWorkerAsync();
        var entry = await SeedEntryAsync(company, worker, JulyStart, JulyEnd, draft =>
        {
            draft.UpdateDraft(111m, 12m, 13m, 14m);
            draft.Adjust(15m, "Manual adjustment remains intact");
        });

        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context, BusinessTime).Handle(
            new CreatePayrollEntryCommand(worker.Id, JulyStart, JulyEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(entry.Id);
        result.Value.CalculatedAmount.Should().Be(0m);
        result.Value.LatenessDeductionAmount.Should().Be(0m);
        result.Value.BonusAmount.Should().Be(0m);
        result.Value.AdvanceDeductedAmount.Should().Be(0m);
        result.Value.AdjustmentAmount.Should().Be(15m);
        result.Value.Status.Should().Be(PayrollEntryStatus.Draft);
    }

    [Fact]
    public async Task Repeated_exact_period_call_does_not_create_a_second_entry()
    {
        var (_, worker, accountant) = await SeedWorkerAsync();

        Guid firstEntryId;
        await using (var context = fixture.CreateDbContext(accountant))
        {
            var handler = new CreatePayrollEntryCommandHandler(context, BusinessTime);
            var first = await handler.Handle(
                new CreatePayrollEntryCommand(worker.Id, JulyStart, JulyEnd), CancellationToken.None);
            var second = await handler.Handle(
                new CreatePayrollEntryCommand(worker.Id, JulyStart, JulyEnd), CancellationToken.None);

            first.IsSuccess.Should().BeTrue();
            second.IsSuccess.Should().BeTrue();
            second.Value.Id.Should().Be(first.Value.Id);
            firstEntryId = first.Value.Id;
        }

        await using var verify = fixture.CreateDbContext(accountant);
        var entries = await verify.PayrollEntries
            .Where(e => e.WorkerId == worker.Id && e.PeriodStart == JulyStart && e.PeriodEnd == JulyEnd)
            .ToListAsync(CancellationToken.None);

        entries.Should().ContainSingle(e => e.Id == firstEntryId);
    }

    [Fact]
    public async Task Exact_Approved_period_returns_PAYROLL_ENTRY_NOT_DRAFT()
    {
        var (company, worker, accountant) = await SeedWorkerAsync();
        var entry = await SeedEntryAsync(company, worker, JulyStart, JulyEnd, draft =>
        {
            draft.UpdateDraft(100m, 0m, 0m, 0m);
            draft.Approve();
        });

        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context, BusinessTime).Handle(
            new CreatePayrollEntryCommand(worker.Id, JulyStart, JulyEnd), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PAYROLL_ENTRY_NOT_DRAFT");

        await using var verify = fixture.CreateDbContext(accountant);
        var entries = await verify.PayrollEntries.Where(e => e.WorkerId == worker.Id).ToListAsync(CancellationToken.None);
        entries.Should().ContainSingle(e => e.Id == entry.Id && e.Status == PayrollEntryStatus.Approved);
    }

    [Fact]
    public async Task Exact_Paid_period_returns_PAYROLL_ENTRY_NOT_DRAFT()
    {
        var (company, worker, accountant) = await SeedWorkerAsync();
        var entry = await SeedEntryAsync(company, worker, JulyStart, JulyEnd, draft =>
        {
            draft.UpdateDraft(100m, 0m, 0m, 0m);
            draft.Approve();
            draft.Pay(DateTimeOffset.UtcNow);
        });

        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context, BusinessTime).Handle(
            new CreatePayrollEntryCommand(worker.Id, JulyStart, JulyEnd), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PAYROLL_ENTRY_NOT_DRAFT");

        await using var verify = fixture.CreateDbContext(accountant);
        var entries = await verify.PayrollEntries.Where(e => e.WorkerId == worker.Id).ToListAsync(CancellationToken.None);
        entries.Should().ContainSingle(e => e.Id == entry.Id && e.Status == PayrollEntryStatus.Paid);
    }

    [Fact]
    public async Task Partially_overlapping_different_period_returns_PAYROLL_PERIOD_OVERLAP()
    {
        var (company, worker, accountant) = await SeedWorkerAsync();
        await SeedEntryAsync(company, worker, new DateOnly(2026, 6, 16), new DateOnly(2026, 7, 15));

        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context, BusinessTime).Handle(
            new CreatePayrollEntryCommand(worker.Id, JulyStart, JulyEnd), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PAYROLL_PERIOD_OVERLAP");

        await using var verify = fixture.CreateDbContext(accountant);
        (await verify.PayrollEntries.CountAsync(e => e.WorkerId == worker.Id, CancellationToken.None)).Should().Be(1);
    }

    [Fact]
    public async Task Non_overlapping_standard_period_creates_a_new_entry()
    {
        var (company, worker, accountant) = await SeedWorkerAsync();
        var julyEntry = await SeedEntryAsync(company, worker, JulyStart, JulyEnd);

        await using var context = fixture.CreateDbContext(accountant);
        var result = await new CreatePayrollEntryCommandHandler(context, BusinessTime).Handle(
            new CreatePayrollEntryCommand(worker.Id, AugustStart, AugustEnd), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().NotBe(julyEntry.Id);
        result.Value.PeriodStart.Should().Be(AugustStart);
        result.Value.PeriodEnd.Should().Be(AugustEnd);

        await using var verify = fixture.CreateDbContext(accountant);
        (await verify.PayrollEntries.CountAsync(e => e.WorkerId == worker.Id, CancellationToken.None)).Should().Be(2);
    }

    [Fact]
    public async Task Repeated_draft_generator_run_does_not_log_PAYROLL_PERIOD_OVERLAP()
    {
        var (company, worker, accountant) = await SeedWorkerAsync();
        var logger = new RecordingLogger();

        await using (var context = fixture.CreateDbContext(accountant))
        {
            await PayrollDraftGenerator.GenerateForCompanyAsync(
                context, company, new DateOnly(2026, 8, 10), BusinessTime, logger, CancellationToken.None);
            await PayrollDraftGenerator.GenerateForCompanyAsync(
                context, company, new DateOnly(2026, 8, 10), BusinessTime, logger, CancellationToken.None);
        }

        logger.Entries.Should().NotContain(e =>
            e.Level == LogLevel.Error && e.Message.Contains("PAYROLL_PERIOD_OVERLAP", StringComparison.Ordinal));

        await using var verify = fixture.CreateDbContext(accountant);
        var entries = await verify.PayrollEntries
            .Where(e => e.WorkerId == worker.Id && e.PeriodStart == JulyStart && e.PeriodEnd == JulyEnd)
            .ToListAsync(CancellationToken.None);
        entries.Should().ContainSingle(e => e.Status == PayrollEntryStatus.Draft);
    }

    private async Task<(Company Company, Worker Worker, FixedCurrentUserService Accountant)> SeedWorkerAsync()
    {
        var company = Company.Create(Guid.NewGuid(), $"Payroll upsert {Guid.NewGuid():N}");
        var brigade = Brigade.Create(company.Id, "Payroll brigade");
        var worker = Worker.Create(
            company.Id,
            brigade.Id,
            "Payroll worker",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            new DateOnly(1990, 1, 1),
            PayRateType.Hourly,
            40m,
            new DateOnly(2020, 1, 1));

        await using var seed = fixture.CreateDbContext();
        seed.Companies.Add(company);
        seed.Brigades.Add(brigade);
        seed.Workers.Add(worker);
        await seed.SaveChangesAsync(CancellationToken.None);

        return (company, worker, new FixedCurrentUserService(company.Id, Guid.NewGuid(), Role.Accountant));
    }

    private async Task<PayrollEntry> SeedEntryAsync(
        Company company,
        Worker worker,
        DateOnly periodStart,
        DateOnly periodEnd,
        Action<PayrollEntry>? configure = null)
    {
        var entry = PayrollEntry.Create(company.Id, worker.Id, periodStart, periodEnd);
        configure?.Invoke(entry);

        await using var seed = fixture.CreateDbContext();
        seed.PayrollEntries.Add(entry);
        await seed.SaveChangesAsync(CancellationToken.None);

        return entry;
    }

    private sealed class RecordingLogger : ILogger
    {
        public List<LogEntry> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => NoopDisposable.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Entries.Add(new LogEntry(logLevel, formatter(state, exception)));
        }
    }

    private sealed record LogEntry(LogLevel Level, string Message);

    private sealed class NoopDisposable : IDisposable
    {
        public static readonly NoopDisposable Instance = new();

        public void Dispose() { }
    }
}
