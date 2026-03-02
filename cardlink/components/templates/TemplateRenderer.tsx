"use client";

import type { TemplateRendererProps } from "./types";
import ClassicBusinessTemplate from "./ClassicBusinessTemplate";
import FullscreenHeroTabsTemplate from "./FullscreenHeroTabsTemplate";
import MinimalEditorialTemplate from "./MinimalEditorialTemplate";
import ProfileCommunityTemplate from "./ProfileCommunityTemplate";

export type { TemplateRendererProps };

export default function TemplateRenderer(props: TemplateRendererProps) {
  switch (props.template) {
    case "fullscreen-hero-tabs":
      return <FullscreenHeroTabsTemplate {...props} />;
    case "minimal-editorial":
      return <MinimalEditorialTemplate {...props} />;
    case "profile-community":
      return <ProfileCommunityTemplate {...props} />;
    case "classic-business":
    default:
      return <ClassicBusinessTemplate {...props} />;
  }
}
