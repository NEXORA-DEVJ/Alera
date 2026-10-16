package com.alera.notifications.infrastructure.firebase;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${alera.firebase.credentials-path:}")
    private String credentialsPath;

    @Value("${alera.firebase.credentials-json:}")
    private String credentialsJson;

    @Bean
    public FirebaseMessaging firebaseMessaging() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseMessaging.getInstance();
        }

        try {
            InputStream credentialsStream = resolveCredentialsStream();
            if (credentialsStream == null) {
                log.warn("ALERA: No se detectaron credenciales de Firebase FCM. El sistema operara en modo simulacion/fallback seguro.");
                return null;
            }

            try (credentialsStream) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                        .build();

                FirebaseApp app = FirebaseApp.initializeApp(options);
                log.info("ALERA: Firebase Admin SDK inicializado exitosamente (App: {}).", app.getName());
                return FirebaseMessaging.getInstance(app);
            }
        } catch (Exception ex) {
            log.error("ALERA: Advertencia al inicializar Firebase Admin SDK: {}. Continuando en modo fallback.", ex.getMessage());
            return null;
        }
    }

    private InputStream resolveCredentialsStream() {
        // 1. JSON directo inyectado por variable de entorno
        if (credentialsJson != null && !credentialsJson.trim().isEmpty()) {
            return new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8));
        }
        String envJson = System.getenv("FIREBASE_CREDENTIALS_JSON");
        if (envJson != null && !envJson.trim().isEmpty()) {
            return new ByteArrayInputStream(envJson.getBytes(StandardCharsets.UTF_8));
        }

        // 2. Ruta a archivo indicada por propiedad o variable de entorno
        if (credentialsPath != null && !credentialsPath.trim().isEmpty()) {
            File file = new File(credentialsPath);
            if (file.exists() && file.isFile()) {
                try {
                    return new FileInputStream(file);
                } catch (Exception ignored) {}
            }
        }
        String envPath = System.getenv("GOOGLE_APPLICATION_CREDENTIALS");
        if (envPath != null && !envPath.trim().isEmpty()) {
            File file = new File(envPath);
            if (file.exists() && file.isFile()) {
                try {
                    return new FileInputStream(file);
                } catch (Exception ignored) {}
            }
        }

        // 3. Archivo estandar en la raiz o carpeta backend
        File[] candidateFiles = new File[]{
                new File("serviceAccountKey.json"),
                new File("backend/serviceAccountKey.json"),
                new File("../serviceAccountKey.json")
        };
        for (File candidate : candidateFiles) {
            if (candidate.exists() && candidate.isFile()) {
                try {
                    return new FileInputStream(candidate);
                } catch (Exception ignored) {}
            }
        }

        // 4. Archivo en el classpath de recursos
        return getClass().getClassLoader().getResourceAsStream("firebase-service-account.json");
    }
}
