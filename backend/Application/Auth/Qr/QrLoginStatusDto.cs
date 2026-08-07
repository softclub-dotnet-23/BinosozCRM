namespace Application.Auth.Qr;

// Status only — deliberately nothing else. This is the one QR endpoint callable
// with just a sessionId (public, used for web polling); it must never leak who
// approved it or any token material.
public sealed record QrLoginStatusDto(string Status);
