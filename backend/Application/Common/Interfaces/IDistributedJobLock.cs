namespace Application.Common.Interfaces;

public interface IDistributedJobLock
{
    Task<IAsyncDisposable?> TryAcquireAsync(string name, CancellationToken cancellationToken);
}
