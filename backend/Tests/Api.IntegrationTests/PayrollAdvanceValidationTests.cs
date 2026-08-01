using Application.PayrollAdvances;
using FluentAssertions;

namespace Api.IntegrationTests;

public sealed class PayrollAdvanceValidationTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Non_positive_advance_amount_is_rejected(decimal amount)
    {
        var result = new CreatePayrollAdvanceCommandValidator().Validate(
            new CreatePayrollAdvanceCommand(Guid.NewGuid(), amount, null));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Amount");
    }
}
