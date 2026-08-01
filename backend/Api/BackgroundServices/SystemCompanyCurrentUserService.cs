using Application.Common.Interfaces;
using Domain.Enums;

namespace Api.BackgroundServices;

// A minimal per-company "actor" for background DbContext access — no
// HttpContext exists here, so the DI-registered CurrentUserService (which
// reads claims off the current request) can't supply a CompanyId. This
// stands in for it directly, one instance per company per run. Shared by
// every background job that needs a per-company ApplicationDbContext
// (OverdueCheckBackgroundService and PayrollDraftBackgroundService).
internal sealed class SystemCompanyCurrentUserService(Guid companyId) : ICurrentUserService
{
    public Guid? UserId => null;
    public Guid? CompanyId => companyId;
    public Role? Role => null;
}
