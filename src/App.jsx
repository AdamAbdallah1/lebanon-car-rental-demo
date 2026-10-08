import { createBrowserRouter } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import RouteError from "./components/layout/RouteError.jsx";

/**
 * Routing — one shared path set for both languages.
 *
 * Every page is a separate chunk so the first paint only downloads the shell,
 * the home route and the search widget. The language is never part of the
 * path; it lives in localStorage with a `?lang` override on first load.
 */

const page = (loader) => async () => {
  const mod = await loader();
  return { Component: mod.default ?? mod.Page };
};

export const routes = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: page(() => import("./pages/HomePage.jsx")),
      },
      {
        path: "fleet",
        lazy: page(() => import("./pages/FleetPage.jsx")),
      },
      {
        path: "fleet/:category",
        lazy: page(() => import("./pages/FleetPage.jsx")),
      },
      {
        path: "vehicle/:id",
        lazy: page(() => import("./pages/VehiclePage.jsx")),
      },
      {
        path: "book",
        lazy: page(() => import("./pages/BookPage.jsx")),
      },
      {
        path: "locations",
        lazy: page(() => import("./pages/LocationsPage.jsx")),
      },
      {
        path: "locations/:locationId",
        lazy: page(() => import("./pages/LocationDetailPage.jsx")),
      },
      {
        path: "services",
        lazy: page(() => import("./pages/ServicesPage.jsx")),
      },
      {
        path: "offers",
        lazy: page(() => import("./pages/OffersPage.jsx")),
      },
      {
        path: "about",
        lazy: page(() => import("./pages/AboutPage.jsx")),
      },
      {
        path: "faq",
        lazy: page(() => import("./pages/FaqPage.jsx")),
      },
      {
        path: "contact",
        lazy: page(() => import("./pages/ContactPage.jsx")),
      },
      {
        path: "rental-terms",
        lazy: page(() => import("./pages/RentalTermsPage.jsx")),
      },
      {
        path: "*",
        lazy: page(() => import("./pages/NotFoundPage.jsx")),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);

export default router;
