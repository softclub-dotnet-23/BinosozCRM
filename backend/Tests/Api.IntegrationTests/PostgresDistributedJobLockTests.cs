using Application.Common.Interfaces;
using FluentAssertions;
using Infrastructure.BackgroundJobs;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class PostgresDistributedJobLockTests(PostgresFixture fixture)
{
    [Fact]
    public async Task First_caller_acquires_and_concurrent_caller_is_skipped()
    {
        await using var firstContext = fixture.CreateDbContext();
        await using var secondContext = fixture.CreateDbContext();
        var first = new PostgresDistributedJobLock(firstContext);
        var second = new PostgresDistributedJobLock(secondContext);

        await using var held = await first.TryAcquireAsync("test:shared-lock", CancellationToken.None);
        var concurrent = await second.TryAcquireAsync("test:shared-lock", CancellationToken.None);

        held.Should().NotBeNull();
        concurrent.Should().BeNull();
    }

    [Fact]
    public async Task Different_keys_do_not_block_each_other_and_disposal_releases_lock()
    {
        await using var firstContext = fixture.CreateDbContext();
        await using var secondContext = fixture.CreateDbContext();
        await using var thirdContext = fixture.CreateDbContext();
        var first = new PostgresDistributedJobLock(firstContext);
        var second = new PostgresDistributedJobLock(secondContext);
        var third = new PostgresDistributedJobLock(thirdContext);

        var held = await first.TryAcquireAsync("test:first", CancellationToken.None);
        await using var different = await second.TryAcquireAsync("test:second", CancellationToken.None);
        await held!.DisposeAsync();
        await using var reacquired = await third.TryAcquireAsync("test:first", CancellationToken.None);

        different.Should().NotBeNull();
        reacquired.Should().NotBeNull();
    }

    [Fact]
    public async Task Lock_is_released_when_the_protected_operation_throws()
    {
        const string key = "test:exception-release";
        await using (var context = fixture.CreateDbContext())
        {
            var provider = new PostgresDistributedJobLock(context);
            try
            {
                await using var held = await provider.TryAcquireAsync(key, CancellationToken.None);
                throw new InvalidOperationException("simulated job failure");
            }
            catch (InvalidOperationException)
            {
            }
        }

        await using var verifyContext = fixture.CreateDbContext();
        var verify = new PostgresDistributedJobLock(verifyContext);
        await using var reacquired = await verify.TryAcquireAsync(key, CancellationToken.None);
        reacquired.Should().NotBeNull();
    }
}
