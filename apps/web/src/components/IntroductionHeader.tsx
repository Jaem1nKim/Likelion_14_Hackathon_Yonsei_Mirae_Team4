import { CustomerHeader } from "./CustomerHeader";

type IntroductionHeaderProps = {
  logoSrc: string;
};

export function IntroductionHeader({ logoSrc: _logoSrc }: IntroductionHeaderProps) {
  return <CustomerHeader />;
}
