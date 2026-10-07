using BirthdaySurprise.Components;

var builder = WebApplication.CreateBuilder(args);

// Interactive Server lets Razor event handlers respond to the birthday button.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

// Serve the photo and the small, hand-written pointer-effect script from wwwroot.
app.UseStaticFiles();
app.UseAntiforgery();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
