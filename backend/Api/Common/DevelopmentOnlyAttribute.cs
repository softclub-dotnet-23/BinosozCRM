namespace Api.Common;

// Marker only — DevelopmentOnlyActionConvention is what actually removes the
// action's route(s) outside Development. A handler-level IHostEnvironment
// check alone still leaves the endpoint mapped and enumerable in production
// (visible in routing/Swagger, reachable, just always 404ing); this instead
// makes it not exist in the endpoint table at all outside Development — the
// same posture as never having registered the controller action.
[AttributeUsage(AttributeTargets.Method)]
public sealed class DevelopmentOnlyAttribute : Attribute;
