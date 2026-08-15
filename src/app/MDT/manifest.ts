import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Apollo Mobile Data Terminal",
    short_name: "Apollo MDT",
    description: "ApolloEMS operational mobile data terminal",
    start_url: "/MDT",
    scope: "/MDT",
    display: "standalone",
    orientation: "landscape",
    background_color: "#071c31",
    theme_color: "#071c31",
    icons: [{ src: "/apollo-logo.png", sizes: "any", type: "image/png", purpose: "any" }],
  };
}
