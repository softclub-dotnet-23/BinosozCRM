# Build context is backend/ (Railway service Root Directory).
# Only Domain -> Application -> Infrastructure -> Api are needed for the
# runtime image; TelegramBot and Tests/Api.IntegrationTests are deliberately
# never copied into either stage (TelegramBot isn't deployed yet, Tests pulls
# Testcontainers/xUnit that has no place in a production image).

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Central package management + project files first, for restore layer caching
# independent of source-code churn.
COPY Directory.Build.props Directory.Packages.props ./
COPY Domain/Domain.csproj Domain/
COPY Application/Application.csproj Application/
COPY Infrastructure/Infrastructure.csproj Infrastructure/
COPY Api/Api.csproj Api/
RUN dotnet restore Api/Api.csproj

COPY Domain/ Domain/
COPY Application/ Application/
COPY Infrastructure/ Infrastructure/
COPY Api/ Api/
RUN dotnet publish Api/Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Non-root — the runtime image doesn't need root, and Railway containers
# gain nothing from running as one.
RUN useradd --uid 5000 --user-group --no-create-home appuser
COPY --from=build --chown=appuser:appuser /app/publish .
USER appuser

# No EXPOSE / hardcoded port — Railway assigns PORT at deploy time; the app
# listens on whatever ASPNETCORE_URLS is set to as a Railway service
# variable (see docs/DEPLOYMENT_RAILWAY.md), never a value baked in here.

# Exec form (not shell form) — required so `dotnet` receives SIGTERM
# directly from the container runtime and can shut down gracefully instead
# of being killed after Railway's stop timeout.
ENTRYPOINT ["dotnet", "Api.dll"]
