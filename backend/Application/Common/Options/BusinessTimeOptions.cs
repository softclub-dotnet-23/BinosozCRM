namespace Application.Common.Options;

public sealed class BusinessTimeOptions
{
    public const string SectionName = "BusinessTime";
    public const string AsiaDushanbeTimeZoneId = "Asia/Dushanbe";

    public string TimeZoneId { get; init; } = AsiaDushanbeTimeZoneId;
}
