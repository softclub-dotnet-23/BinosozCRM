using Application.Auth.Qr;
using Application.Common.Security;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class QrLoginSessionCommandTests(PostgresFixture fixture)
{
    private readonly Argon2PasswordHasher _passwordHasher = new();

    private async Task<(User User, Guid CompanyId)> SeedUserAsync(string password, bool isActive = true)
    {
        await using var context = fixture.CreateDbContext();

        var company = Company.Create(Guid.NewGuid(), $"QR Test Co {Guid.NewGuid()}");
        var user = User.Create(
            company.Id,
            "QR Test User",
            $"+992{Random.Shared.NextInt64(100000000, 999999999)}",
            _passwordHasher.Hash(password),
            Role.Prorab);

        if (!isActive)
            user.Deactivate();

        context.Companies.Add(company);
        context.Users.Add(user);
        await context.SaveChangesAsync(CancellationToken.None);

        return (user, company.Id);
    }

    private async Task<QrLoginSession> DirectlySeedSessionAsync(string tokenHash, DateTimeOffset expiresAt, QrLoginSessionStatus status = QrLoginSessionStatus.Pending)
    {
        await using var context = fixture.CreateDbContext();
        var session = QrLoginSession.Create(tokenHash, expiresAt, "127.0.0.1");
        // Reflect straight to the desired status for tests that need something
        // other than the freshly-created Pending state, without re-deriving the
        // whole approve/reject/expire pipeline just to set up a fixture.
        if (status != QrLoginSessionStatus.Pending)
        {
            var prop = typeof(QrLoginSession).GetProperty(nameof(QrLoginSession.Status))!;
            prop.SetValue(session, status);
        }
        context.QrLoginSessions.Add(session);
        await context.SaveChangesAsync(CancellationToken.None);
        return session;
    }

    [Fact]
    public async Task Start_creates_a_pending_session_with_a_short_TTL_and_never_stores_the_raw_token()
    {
        await using var context = fixture.CreateDbContext();
        var handler = new StartQrLoginSessionCommandHandler(context);

        var before = DateTimeOffset.UtcNow;
        var result = await handler.Handle(new StartQrLoginSessionCommand("127.0.0.1"), CancellationToken.None);
        var after = DateTimeOffset.UtcNow;

        result.IsSuccess.Should().BeTrue();
        result.Value.QrToken.Should().NotBeNullOrWhiteSpace();
        result.Value.QrPayload.Should().Contain(Uri.EscapeDataString(result.Value.QrToken));
        result.Value.ExpiresAt.Should().BeCloseTo(before.Add(StartQrLoginSessionCommandHandler.SessionTtl), TimeSpan.FromSeconds(5));
        result.Value.ExpiresAt.Should().BeOnOrBefore(after.Add(StartQrLoginSessionCommandHandler.SessionTtl));

        await using var verifyContext = fixture.CreateDbContext();
        var persisted = await verifyContext.QrLoginSessions.SingleAsync(s => s.Id == result.Value.SessionId);
        persisted.Status.Should().Be(QrLoginSessionStatus.Pending);
        persisted.TokenHash.Should().Be(RefreshTokenGenerator.Hash(result.Value.QrToken));
        persisted.TokenHash.Should().NotBe(result.Value.QrToken);
    }

    [Fact]
    public async Task Status_reports_Expired_for_a_still_Pending_session_past_its_TTL_without_a_background_job()
    {
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash("irrelevant"), DateTimeOffset.UtcNow.AddMinutes(-1));

        await using var context = fixture.CreateDbContext();
        var result = await new GetQrLoginSessionStatusQueryHandler(context).Handle(new GetQrLoginSessionStatusQuery(session.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be("Expired");
    }

    [Fact]
    public async Task Status_for_an_unknown_session_id_fails_with_not_found()
    {
        await using var context = fixture.CreateDbContext();
        var result = await new GetQrLoginSessionStatusQueryHandler(context).Handle(new GetQrLoginSessionStatusQuery(Guid.NewGuid()), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_QR_SESSION_NOT_FOUND");
    }

    [Fact]
    public async Task Scan_with_wrong_token_is_rejected_and_leaves_the_session_Pending()
    {
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash($"the-real-token-{Guid.NewGuid()}"), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var context = fixture.CreateDbContext();
        var result = await new ScanQrLoginSessionCommandHandler(context).Handle(new ScanQrLoginSessionCommand(session.Id, "wrong-token"), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");

        await using var verify = fixture.CreateDbContext();
        (await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id)).Status.Should().Be(QrLoginSessionStatus.Pending);
    }

    [Fact]
    public async Task Scan_with_the_correct_token_moves_Pending_to_Scanned()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var context = fixture.CreateDbContext();
        var result = await new ScanQrLoginSessionCommandHandler(context).Handle(new ScanQrLoginSessionCommand(session.Id, token), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        await using var verify = fixture.CreateDbContext();
        (await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id)).Status.Should().Be(QrLoginSessionStatus.Scanned);
    }

    [Fact]
    public async Task Approve_records_the_approving_users_own_identity_not_a_client_supplied_one()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var (user, companyId) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var context = fixture.CreateDbContext();
        var currentUser = new FixedCurrentUserService(companyId, user.Id, Role.Prorab);
        var result = await new ApproveQrLoginSessionCommandHandler(context, currentUser)
            .Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        await using var verify = fixture.CreateDbContext();
        var persisted = await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id);
        persisted.Status.Should().Be(QrLoginSessionStatus.Approved);
        persisted.ApprovedUserId.Should().Be(user.Id);
        persisted.ApprovedCompanyId.Should().Be(companyId);
    }

    [Fact]
    public async Task Approve_with_wrong_token_is_unauthorized_and_the_session_stays_Pending()
    {
        var (user, companyId) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash($"the-real-token-{Guid.NewGuid()}"), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var context = fixture.CreateDbContext();
        var currentUser = new FixedCurrentUserService(companyId, user.Id, Role.Prorab);
        var result = await new ApproveQrLoginSessionCommandHandler(context, currentUser)
            .Handle(new ApproveQrLoginSessionCommand(session.Id, "wrong-token"), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");

        await using var verify = fixture.CreateDbContext();
        (await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id)).ApprovedUserId.Should().BeNull();
    }

    [Fact]
    public async Task Approve_of_an_expired_session_is_rejected()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var (user, companyId) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(-1));

        await using var context = fixture.CreateDbContext();
        var currentUser = new FixedCurrentUserService(companyId, user.Id, Role.Prorab);
        var result = await new ApproveQrLoginSessionCommandHandler(context, currentUser)
            .Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");
    }

    [Fact]
    public async Task Approve_of_an_already_rejected_session_is_denied()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var (user, companyId) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3), QrLoginSessionStatus.Rejected);

        await using var context = fixture.CreateDbContext();
        var currentUser = new FixedCurrentUserService(companyId, user.Id, Role.Prorab);
        var result = await new ApproveQrLoginSessionCommandHandler(context, currentUser)
            .Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");
    }

    [Fact]
    public async Task Second_sequential_approve_of_an_already_approved_session_is_denied_and_does_not_overwrite_the_first_approver()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var (firstUser, firstCompanyId) = await SeedUserAsync("irrelevant");
        var (secondUser, secondCompanyId) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using (var firstContext = fixture.CreateDbContext())
        {
            var firstCurrentUser = new FixedCurrentUserService(firstCompanyId, firstUser.Id, Role.Prorab);
            var firstResult = await new ApproveQrLoginSessionCommandHandler(firstContext, firstCurrentUser)
                .Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None);
            firstResult.IsSuccess.Should().BeTrue();
        }

        await using var secondContext = fixture.CreateDbContext();
        var secondCurrentUser = new FixedCurrentUserService(secondCompanyId, secondUser.Id, Role.Prorab);
        var secondResult = await new ApproveQrLoginSessionCommandHandler(secondContext, secondCurrentUser)
            .Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None);

        secondResult.IsSuccess.Should().BeFalse();
        secondResult.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");

        await using var verify = fixture.CreateDbContext();
        var persisted = await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id);
        persisted.ApprovedUserId.Should().Be(firstUser.Id, "a second approve must never overwrite the first approver's identity");
        persisted.ApprovedCompanyId.Should().Be(firstCompanyId);
    }

    [Fact]
    public async Task Reject_moves_a_Pending_session_to_Rejected()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var context = fixture.CreateDbContext();
        var result = await new RejectQrLoginSessionCommandHandler(context).Handle(new RejectQrLoginSessionCommand(session.Id, token), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        await using var verify = fixture.CreateDbContext();
        (await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id)).Status.Should().Be(QrLoginSessionStatus.Rejected);
    }

    [Fact]
    public async Task Exchange_before_approval_is_denied()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var context = fixture.CreateDbContext();
        var handler = new ExchangeQrLoginSessionCommandHandler(context, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);
        var result = await handler.Handle(new ExchangeQrLoginSessionCommand(session.Id, token, "127.0.0.1"), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");
    }

    [Fact]
    public async Task Exchange_of_a_rejected_or_expired_session_is_denied()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var rejected = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3), QrLoginSessionStatus.Rejected);
        var expired = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash($"other-token-{Guid.NewGuid()}"), DateTimeOffset.UtcNow.AddMinutes(-1), QrLoginSessionStatus.Approved);

        await using var context = fixture.CreateDbContext();
        var handler = new ExchangeQrLoginSessionCommandHandler(context, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);

        var rejectedResult = await handler.Handle(new ExchangeQrLoginSessionCommand(rejected.Id, token, "127.0.0.1"), CancellationToken.None);
        rejectedResult.IsSuccess.Should().BeFalse();
        rejectedResult.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");

        var expiredResult = await handler.Handle(new ExchangeQrLoginSessionCommand(expired.Id, "some-other-nonmatching-token", "127.0.0.1"), CancellationToken.None);
        expiredResult.IsSuccess.Should().BeFalse();
        expiredResult.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");
    }

    [Fact]
    public async Task Full_flow_approve_then_exchange_returns_real_tokens_and_a_second_exchange_is_denied()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var (user, companyId) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using (var approveContext = fixture.CreateDbContext())
        {
            var currentUser = new FixedCurrentUserService(companyId, user.Id, Role.Prorab);
            var approveResult = await new ApproveQrLoginSessionCommandHandler(approveContext, currentUser)
                .Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None);
            approveResult.IsSuccess.Should().BeTrue();
        }

        await using var exchangeContext = fixture.CreateDbContext();
        var exchangeHandler = new ExchangeQrLoginSessionCommandHandler(exchangeContext, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);
        var exchangeResult = await exchangeHandler.Handle(new ExchangeQrLoginSessionCommand(session.Id, token, "127.0.0.1"), CancellationToken.None);

        exchangeResult.IsSuccess.Should().BeTrue();
        exchangeResult.Value.AccessToken.Should().NotBeNullOrWhiteSpace();
        exchangeResult.Value.RefreshToken.Should().NotBeNullOrWhiteSpace();
        exchangeResult.Value.Role.Should().Be(Role.Prorab.ToString());

        // Tenant check: the issued session belongs to the approving user's own
        // company, never anything the caller could have influenced.
        await using var verifyContext = fixture.CreateDbContext();
        var persistedRefreshToken = await verifyContext.RefreshTokens.IgnoreQueryFilters()
            .SingleAsync(rt => rt.UserId == user.Id);
        persistedRefreshToken.CompanyId.Should().Be(companyId);
        persistedRefreshToken.TokenHash.Should().Be(RefreshTokenGenerator.Hash(exchangeResult.Value.RefreshToken));

        // Second exchange with the same qrToken must fail — one-time use.
        await using var secondExchangeContext = fixture.CreateDbContext();
        var secondExchangeHandler = new ExchangeQrLoginSessionCommandHandler(secondExchangeContext, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);
        var secondExchangeResult = await secondExchangeHandler.Handle(new ExchangeQrLoginSessionCommand(session.Id, token, "127.0.0.1"), CancellationToken.None);

        secondExchangeResult.IsSuccess.Should().BeFalse();
        secondExchangeResult.Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");
    }

    [Fact]
    public async Task Knowing_only_the_session_id_without_the_qrToken_can_never_approve_or_exchange()
    {
        var realToken = $"the-real-token-{Guid.NewGuid()}";
        var (user, companyId) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(realToken), DateTimeOffset.UtcNow.AddMinutes(3));

        // Attacker knows the sessionId (e.g. from a polled status URL) but not the secret.
        await using var context = fixture.CreateDbContext();
        var currentUser = new FixedCurrentUserService(companyId, user.Id, Role.Prorab);

        var approveWithEmptyToken = await new ApproveQrLoginSessionCommandHandler(context, currentUser)
            .Handle(new ApproveQrLoginSessionCommand(session.Id, "attacker-guess"), CancellationToken.None);
        approveWithEmptyToken.IsSuccess.Should().BeFalse();

        var exchangeHandler = new ExchangeQrLoginSessionCommandHandler(context, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);
        var exchangeWithGuess = await exchangeHandler.Handle(new ExchangeQrLoginSessionCommand(session.Id, "attacker-guess", "127.0.0.1"), CancellationToken.None);
        exchangeWithGuess.IsSuccess.Should().BeFalse();
    }

    [Fact]
    public async Task Dev_approve_resolves_identity_from_phone_and_password_and_uses_the_real_approval_path()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        const string password = "correct-horse-battery-staple";
        var (user, companyId) = await SeedUserAsync(password);
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var context = fixture.CreateDbContext();
        var handler = new DevApproveQrLoginSessionCommandHandler(context, _passwordHasher);
        var result = await handler.Handle(new DevApproveQrLoginSessionCommand(session.Id, token, user.Phone, password), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        await using var verify = fixture.CreateDbContext();
        var persisted = await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id);
        persisted.Status.Should().Be(QrLoginSessionStatus.Approved);
        persisted.ApprovedUserId.Should().Be(user.Id);
        persisted.ApprovedCompanyId.Should().Be(companyId);
    }

    [Fact]
    public async Task Dev_approve_with_wrong_password_is_rejected_and_never_approves()
    {
        var token = $"the-real-token-{Guid.NewGuid()}";
        var (user, _) = await SeedUserAsync("correct-password");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var context = fixture.CreateDbContext();
        var handler = new DevApproveQrLoginSessionCommandHandler(context, _passwordHasher);
        var result = await handler.Handle(new DevApproveQrLoginSessionCommand(session.Id, token, user.Phone, "wrong-password"), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("AUTH_INVALID_CREDENTIALS");

        await using var verify = fixture.CreateDbContext();
        (await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id)).Status.Should().Be(QrLoginSessionStatus.Pending);
    }

    // Two independent DbContexts + two handler instances, dispatched together
    // via Task.WhenAll — the real shape of two separate concurrent HTTP
    // requests, each with its own scoped DbContext, not a single sequential
    // call pretending to race. Real Postgres round-trips (Testcontainers) give
    // enough of a window for both SELECTs to land before either COMMIT; xmin
    // (QrLoginSessionConfiguration) is what actually guarantees a single
    // winner regardless of exact interleaving.
    [Fact]
    public async Task Concurrent_exchange_of_the_same_approved_session_issues_only_one_pair_of_tokens()
    {
        var token = $"concurrent-exchange-token-{Guid.NewGuid()}";
        var (user, companyId) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using (var approveContext = fixture.CreateDbContext())
        {
            var currentUser = new FixedCurrentUserService(companyId, user.Id, Role.Prorab);
            var approveResult = await new ApproveQrLoginSessionCommandHandler(approveContext, currentUser)
                .Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None);
            approveResult.IsSuccess.Should().BeTrue();
        }

        await using var contextA = fixture.CreateDbContext();
        await using var contextB = fixture.CreateDbContext();
        var handlerA = new ExchangeQrLoginSessionCommandHandler(contextA, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);
        var handlerB = new ExchangeQrLoginSessionCommandHandler(contextB, new JwtTokenService(AuthTestOptions.Jwt), AuthTestOptions.Jwt);

        var results = await Task.WhenAll(
            handlerA.Handle(new ExchangeQrLoginSessionCommand(session.Id, token, "127.0.0.1"), CancellationToken.None),
            handlerB.Handle(new ExchangeQrLoginSessionCommand(session.Id, token, "127.0.0.1"), CancellationToken.None));

        results.Count(r => r.IsSuccess).Should().Be(1);
        results.Count(r => r.IsFailure).Should().Be(1);
        results.Single(r => r.IsFailure).Error.Code.Should().Be("AUTH_QR_SESSION_INVALID");

        await using var verifyContext = fixture.CreateDbContext();
        var refreshTokenCount = await verifyContext.RefreshTokens.IgnoreQueryFilters().CountAsync(rt => rt.UserId == user.Id);
        refreshTokenCount.Should().Be(1, "exactly one token pair must ever be issued for one Approved session, never two");
    }

    [Fact]
    public async Task Concurrent_approve_of_the_same_session_by_two_different_users_only_one_wins()
    {
        var token = $"concurrent-approve-token-{Guid.NewGuid()}";
        var (userA, companyA) = await SeedUserAsync("irrelevant");
        var (userB, companyB) = await SeedUserAsync("irrelevant");
        var session = await DirectlySeedSessionAsync(RefreshTokenGenerator.Hash(token), DateTimeOffset.UtcNow.AddMinutes(3));

        await using var contextA = fixture.CreateDbContext();
        await using var contextB = fixture.CreateDbContext();
        var handlerA = new ApproveQrLoginSessionCommandHandler(contextA, new FixedCurrentUserService(companyA, userA.Id, Role.Prorab));
        var handlerB = new ApproveQrLoginSessionCommandHandler(contextB, new FixedCurrentUserService(companyB, userB.Id, Role.Prorab));

        var results = await Task.WhenAll(
            handlerA.Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None),
            handlerB.Handle(new ApproveQrLoginSessionCommand(session.Id, token), CancellationToken.None));

        results.Count(r => r.IsSuccess).Should().Be(1);
        results.Count(r => r.IsFailure).Should().Be(1);

        await using var verify = fixture.CreateDbContext();
        var persisted = await verify.QrLoginSessions.SingleAsync(s => s.Id == session.Id);
        persisted.Status.Should().Be(QrLoginSessionStatus.Approved);
        (persisted.ApprovedUserId == userA.Id || persisted.ApprovedUserId == userB.Id).Should().BeTrue();
        // Whichever won, the session's own CompanyId matches that same user —
        // never a mix of one user's id with the other's company.
        var winningCompanyId = persisted.ApprovedUserId == userA.Id ? companyA : companyB;
        persisted.ApprovedCompanyId.Should().Be(winningCompanyId);
    }
}
