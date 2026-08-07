using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.Extensions.Hosting;

namespace Api.Common;

// Applied once, at startup, from the environment ASP.NET Core itself resolved
// (not a per-request check, not client-controllable) — an action carrying
// [DevelopmentOnly] gets its Selectors cleared outside Development, which
// removes it from the endpoint table entirely. MapControllers() never
// produces a route for it; it is exactly as absent as if the action didn't
// exist in the source, not merely refused at runtime.
public sealed class DevelopmentOnlyActionConvention(IHostEnvironment environment) : IActionModelConvention
{
    public void Apply(ActionModel action)
    {
        if (environment.IsDevelopment())
            return;

        if (action.Attributes.OfType<DevelopmentOnlyAttribute>().Any())
            action.Selectors.Clear();
    }
}
