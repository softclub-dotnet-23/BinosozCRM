using System.Data;
using Application.Common.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.BackgroundJobs;

// Session-scoped PostgreSQL advisory lock held by a dedicated open connection.
// It coordinates replicas without adding a scheduler or mutable application state.
public sealed class PostgresDistributedJobLock(ApplicationDbContext context) : IDistributedJobLock
{
    public async Task<IAsyncDisposable?> TryAcquireAsync(string name, CancellationToken cancellationToken)
    {
        var connection = context.Database.GetDbConnection();
        await connection.OpenAsync(cancellationToken);
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT pg_try_advisory_lock(hashtext(@name))";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "@name";
            parameter.DbType = DbType.String;
            parameter.Value = name;
            command.Parameters.Add(parameter);

            if (Convert.ToBoolean(await command.ExecuteScalarAsync(cancellationToken)))
                return new HeldLock(connection, name);
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }

        await connection.DisposeAsync();
        return null;
    }

    private sealed class HeldLock(System.Data.Common.DbConnection connection, string name) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT pg_advisory_unlock(hashtext(@name))";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "@name";
            parameter.DbType = DbType.String;
            parameter.Value = name;
            command.Parameters.Add(parameter);
            await command.ExecuteScalarAsync();
            await connection.DisposeAsync();
        }
    }
}
