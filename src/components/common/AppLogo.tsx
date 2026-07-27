import logo from "../../assets/logos/binosoz-main-logo.svg";

type AppLogoProps = {
  className?: string;
};

/**
 * The one official BINOSOZ logo — same SVG asset everywhere, every role, every page.
 * Do not fork this per-role; if a spot needs a different size, pass className.
 */
export function AppLogo({ className }: AppLogoProps) {
  return (
    <img
      src={logo}
      alt="BINOSOZ Construction Management CRM"
      className={className}
    />
  );
}
