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
    AdvanceIssued,
    // Worker-role checkpoint (docs/PROGRESS.md, post-MASTER addition): an
    // Owner linking an existing Worker record to a new login-capable User —
    // same "власть" category §11.7 covers (who can log in as whom).
    WorkerUserLinked
}
