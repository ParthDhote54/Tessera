package com.tessera.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebMvcCorsConfig implements WebMvcConfigurer {

    @Value("${tessera.cors.allowed-origins:https://tessera-frontend-one-eta.vercel.app,https://*.vercel.app,https://personal-finance-manager-frontends.vercel.app,http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        java.util.Set<String> set = new java.util.HashSet<>(Arrays.asList(allowedOrigins.split(",")));
        set.add("https://tessera-frontend-one-eta.vercel.app");
        set.add("https://*.vercel.app");
        set.add("https://personal-finance-manager-frontends.vercel.app");
        set.add("http://localhost:5173");
        set.add("http://localhost:3000");

        String[] origins = set.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addMapping("/api/**")
                .allowedOriginPatterns(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
