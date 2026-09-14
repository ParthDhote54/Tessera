package com.tessera.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Configuration
public class CorsFilterConfig {

    @Value("${tessera.cors.allowed-origins:https://tessera-frontend-one-eta.vercel.app,https://*.vercel.app,https://personal-finance-manager-frontends.vercel.app,http://localhost:5173,http://localhost:3000}")
    private String allowedOriginsEnv;

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        Set<String> patterns = new HashSet<>(Arrays.asList(allowedOriginsEnv.split(",")));
        patterns.add("https://tessera-frontend-one-eta.vercel.app");
        patterns.add("https://*.vercel.app");
        patterns.add("https://personal-finance-manager-frontends.vercel.app");
        patterns.add("http://localhost:5173");
        patterns.add("http://localhost:3000");

        List<String> patternList = patterns.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        config.setAllowedOriginPatterns(patternList);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
