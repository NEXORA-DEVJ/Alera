package com.alera.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro de ciberseguridad a nivel de servlet.
 * Inyecta cabeceras defensivas estándar de la industria (OWASP)
 * para neutralizar ataques de Clickjacking, MIME sniffing, XSS y Cross-Origin leakage.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 1. Prevenir que la app sea incrustada en iframes externos (Clickjacking)
        response.setHeader("X-Frame-Options", "DENY");

        // 2. Prevenir que el navegador interprete archivos con tipos MIME incorrectos (MIME sniffing)
        response.setHeader("X-Content-Type-Options", "nosniff");

        // 3. Activar el filtro anti-XSS nativo de navegadores modernos
        response.setHeader("X-XSS-Protection", "1; mode=block");

        // 4. Proteger la fuga de rutas de referencia a orígenes externos
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // 5. Content Security Policy estricto para APIs REST
        response.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; object-src 'none';");

        // 6. Restricción de permisos de navegador
        response.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(self)");

        // 7. HSTS (HTTP Strict Transport Security) para exigir conexiones cifradas
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

        filterChain.doFilter(request, response);
    }
}
