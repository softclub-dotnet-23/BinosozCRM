namespace Application.Lookups;

// Intentionally small, frontend-safe display contract. Lookup consumers need
// a stable label for a GUID, not a serialized Worker/ConstructionObject (both
// of which contain fields that must never cross this boundary).
public sealed record LookupItemDto(Guid Id, string Name);
