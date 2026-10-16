package com.alera.shared.util;

import java.util.regex.Pattern;

/**
 * Utilidad de ciberseguridad para desinfección y sanitización de texto.
 * Previene Cross-Site Scripting (XSS), inyecciones de enlaces maliciosos
 * y ataques de denegación de servicio por cadenas desproporcionadas.
 */
public final class TextSanitizer {

    // Patrón defensivo para remover etiquetas HTML, scripts y eventos embebidos
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern SCRIPT_PATTERN = Pattern.compile("(?i)<script.*?>.*?</script.*?>|javascript:|onload=|onerror=|onclick=");
    
    // Patrón para detectar URLs sospechosas o excesivamente largas (> 120 caracteres)
    private static final Pattern EXCESSIVE_URL_PATTERN = Pattern.compile("https?://[^\\s]{120,}", Pattern.CASE_INSENSITIVE);

    private TextSanitizer() {
        // Constructor privado para clase estática
    }

    /**
     * Sanitiza una cadena de texto eliminando etiquetas peligrosas,
     * normalizando espacios y bloqueando enlaces excesivos.
     */
    public static String sanitize(String input) {
        if (input == null) {
            return "";
        }

        String cleaned = input.trim();

        // 1. Eliminar scripts maliciosos y eventos JS
        cleaned = SCRIPT_PATTERN.matcher(cleaned).replaceAll("[contenido-bloqueado]");

        // 2. Despojar cualquier etiqueta HTML residual
        cleaned = HTML_TAG_PATTERN.matcher(cleaned).replaceAll("");

        // 3. Neutralizar URLs excesivamente largas (frecuentes en phishing y ataques de desbordamiento)
        cleaned = EXCESSIVE_URL_PATTERN.matcher(cleaned).replaceAll("[enlace-bloqueado-por-seguridad]");

        // 4. Limitar caracteres de control invisibles
        cleaned = cleaned.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "");

        // 5. Truncar a un máximo de 500 caracteres por seguridad estricta
        if (cleaned.length() > 500) {
            cleaned = cleaned.substring(0, 500);
        }

        return cleaned;
    }

    /**
     * Valida si un texto contiene patrones de inyección obvios.
     */
    public static boolean containsMaliciousPayload(String input) {
        if (input == null || input.isBlank()) {
            return false;
        }
        return SCRIPT_PATTERN.matcher(input).find();
    }
}
