import { HomeIcon } from "lucide-react";
import Index from "./pages/Index.jsx";
import SmartDesignPage from "./pages/SmartDesignPage.jsx";
import ComplianceContentPage from "./pages/ComplianceContentPage.jsx";
import PricingCostPage from "./pages/PricingCostPage.jsx";
import MarketAnalysisPage from "./pages/MarketAnalysisPage.jsx";
import PublishPage from "./pages/PublishPage.jsx";
import DataOperationPage from "./pages/DataOperationPage.jsx";
import ImageOptimizePage from "./pages/ImageOptimizePage.jsx";
import DetailVideoPage from "./pages/DetailVideoPage.jsx";
import DesignToolsPage from "./pages/DesignToolsPage.jsx";
import DetailPageGeneratePage from "./pages/DetailPageGeneratePage.jsx";
import AdCopyPage from "./pages/AdCopyPage.jsx";
import PriceComparePage from "./pages/PriceComparePage.jsx";
import BOMAnalyzePage from "./pages/BOMAnalyzePage.jsx";
import IndustryMatchPage from "./pages/IndustryMatchPage.jsx";
import MarketReportPage from "./pages/MarketReportPage.jsx";
import PlatformRecommendPage from "./pages/PlatformRecommendPage.jsx";
import OneClickPublishPage from "./pages/OneClickPublishPage.jsx";
import MarketingStrategyPage from "./pages/MarketingStrategyPage.jsx";
import PromotionEffectPage from "./pages/PromotionEffectPage.jsx";
import DataMonitorPage from "./pages/DataMonitorPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Index />,
  },
  {
    title: "Smart Design",
    to: "/smart-design",
    page: <SmartDesignPage />,
  },
  {
    title: "Compliance Content",
    to: "/compliance-content",
    page: <ComplianceContentPage />,
  },
  {
    title: "Pricing Cost",
    to: "/pricing-cost",
    page: <PricingCostPage />,
  },
  {
    title: "Market Analysis",
    to: "/market-analysis",
    page: <MarketAnalysisPage />,
  },
  {
    title: "Publish",
    to: "/publish",
    page: <PublishPage />,
  },
  {
    title: "Data Operation",
    to: "/data-operation",
    page: <DataOperationPage />,
  },
  {
    title: "Image Optimize",
    to: "/smart-design/image-optimize",
    page: <ImageOptimizePage />,
  },
  {
    title: "Detail Video",
    to: "/smart-design/detail-video",
    page: <DetailVideoPage />,
  },
  {
    title: "Design Tools",
    to: "/smart-design/tools",
    page: <DesignToolsPage />,
  },
  {
    title: "Detail Page Generate",
    to: "/compliance-content/detail-page",
    page: <DetailPageGeneratePage />,
  },
  {
    title: "Ad Copy",
    to: "/compliance-content/ad-copy",
    page: <AdCopyPage />,
  },
  {
    title: "Price Compare",
    to: "/pricing-cost/price-compare",
    page: <PriceComparePage />,
  },
  {
    title: "BOM Analyze",
    to: "/pricing-cost/bom",
    page: <BOMAnalyzePage />,
  },
  {
    title: "Industry Match",
    to: "/market-analysis/industry",
    page: <IndustryMatchPage />,
  },
  {
    title: "Market Report",
    to: "/market-analysis/report",
    page: <MarketReportPage />,
  },
  {
    title: "Platform Recommend",
    to: "/publish/platform",
    page: <PlatformRecommendPage />,
  },
  {
    title: "One Click Publish",
    to: "/publish/publish-action",
    page: <OneClickPublishPage />,
  },
  {
    title: "Marketing Strategy",
    to: "/data-operation/marketing",
    page: <MarketingStrategyPage />,
  },
  {
    title: "Promotion Effect",
    to: "/data-operation/promotion",
    page: <PromotionEffectPage />,
  },
  {
    title: "Data Monitor",
    to: "/data-operation/monitor",
    page: <DataMonitorPage />,
  },
  {
    title: "Account",
    to: "/account",
    page: <AccountPage />,
  },
  {
    title: "Login",
    to: "/login",
    page: <LoginPage />,
  },
  {
    title: "Register",
    to: "/register",
    page: <RegisterPage />,
  },
];
