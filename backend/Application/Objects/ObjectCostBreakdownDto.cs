namespace Application.Objects;

public sealed record ObjectCostBreakdownDto(
    Guid ObjectId,
    decimal MaterialCost,
    decimal PieceworkPayrollCost,
    decimal HourlyPayrollCost,
    decimal PaidAbsencePayrollCost,
    decimal TotalCost,
    string Note);
