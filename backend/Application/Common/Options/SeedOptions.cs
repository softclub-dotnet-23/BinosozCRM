namespace Application.Common.Options;

public sealed class SeedOptions
{
    public const string SectionName = "Seed";

    public SeedCompanyOptions Company { get; init; } = new();
    public List<SeedOwnerOptions> Owners { get; init; } = [];

    // Gates DemoSeedDataService (Development-only demo dataset). Defaults to
    // off — must be explicitly opted into via Seed:DemoDataEnabled /
    // Seed__DemoDataEnabled=true. Program.cs additionally never calls it
    // outside Development, regardless of this flag.
    public bool DemoDataEnabled { get; init; }
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
