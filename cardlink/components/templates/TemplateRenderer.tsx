"use client";

import { type TemplateId } from "@/src/lib/templates";
import type { TemplateRendererProps } from "./types";
import ClassicBusinessTemplate from "./ClassicBusinessTemplate";
import MinimalistTemplate from "./MinimalistTemplate";
import ModernTechTemplate from "./ModernTechTemplate";
import CreativeAgencyTemplate from "./CreativeAgencyTemplate";
import MedicalProfessionalTemplate from "./MedicalProfessionalTemplate";
import RealEstateTemplate from "./RealEstateTemplate";
import FashionBeautyTemplate from "./FashionBeautyTemplate";
import FinancialServicesTemplate from "./FinancialServicesTemplate";
import RestaurantFoodTemplate from "./RestaurantFoodTemplate";
import ArtistPortfolioTemplate from "./ArtistPortfolioTemplate";

export type { TemplateRendererProps };

export default function TemplateRenderer(props: TemplateRendererProps) {
  const { template } = props;

  switch (template) {
    case "classic-business":
      return <ClassicBusinessTemplate {...props} />;
    case "minimalist":
      return <MinimalistTemplate {...props} />;
    case "modern-tech":
      return <ModernTechTemplate {...props} />;
    case "creative-agency":
      return <CreativeAgencyTemplate {...props} />;
    case "medical-professional":
      return <MedicalProfessionalTemplate {...props} />;
    case "real-estate":
      return <RealEstateTemplate {...props} />;
    case "fashion-beauty":
      return <FashionBeautyTemplate {...props} />;
    case "financial-services":
      return <FinancialServicesTemplate {...props} />;
    case "restaurant-food":
      return <RestaurantFoodTemplate {...props} />;
    case "artist-portfolio":
      return <ArtistPortfolioTemplate {...props} />;
    default:
      // Fallback to classic business template
      return <ClassicBusinessTemplate {...props} />;
  }
}
