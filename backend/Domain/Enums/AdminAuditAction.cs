namespace Domain.Enums;

public enum AdminAuditAction
{
    UserCreated,
    RoleChanged,
    UserDeactivated,
    // Not in MASTER §5.16's original enumeration — added as the obvious
    // symmetric counterpart to UserDeactivated once user reactivation became
    // a real feature (frontend-integration Users module), same "власть"
    // category §11.7 already covers.
    UserActivated,
    TempPasswordRegenerated,
    OwnerPasswordReset,
    BrigadirAssigned,
    PayRateChanged,
    PayrollPaid,
    AdvanceIssued
}
