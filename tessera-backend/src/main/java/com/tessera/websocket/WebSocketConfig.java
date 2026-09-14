package com.tessera.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final TesseraWebSocketHandler handler;

    @Value("${tessera.cors.allowed-origins:https://tessera-frontend-one-eta.vercel.app,https://*.vercel.app,https://personal-finance-manager-frontends.vercel.app,http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    public WebSocketConfig(TesseraWebSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addHandler(handler, "/ws")
                .setAllowedOriginPatterns(origins);
    }
}
