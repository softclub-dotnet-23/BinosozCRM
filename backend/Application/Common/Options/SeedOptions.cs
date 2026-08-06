namespace Application.Common.Options;

public sealed class SeedOptions
{
    public const string SectionName = "Seed";

    public SeedCompanyOptions Company { get; init; } = new();
    public List<SeedOwnerOptions> Owners { get; init; } = [];
}

public sealed class SeedCompanyOptions
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class SeedOwnerOptions
{
    public string Phone { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
}
