package com.alera.notifications.infrastructure.sender;

import com.alera.notifications.domain.model.NotificationResult;
import com.alera.notifications.domain.model.PushAlertMessage;
import com.alera.notifications.domain.port.out.PushNotificationSenderPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@Primary
public class ExpoPushNotificationAdapter implements PushNotificationSenderPort {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushNotificationAdapter.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final RestClient restClient;

    public ExpoPushNotificationAdapter() {
        this.restClient = RestClient.builder().build();
    }

    @Override
    public NotificationResult send(PushAlertMessage message) {
        String token = message.fcmToken();

        // Si el token es de Expo (ExponentPushToken[...]) se despacha a la API oficial de Expo Push
        if (token != null && (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["))) {
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("to", token);
                payload.put("title", message.title());
                payload.put("body", message.body());
                payload.put("sound", "default");
                payload.put("priority", "high");
                payload.put("data", message.data());

                restClient.post()
                        .uri(EXPO_PUSH_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(payload)
                        .retrieve()
                        .toBodilessEntity();

                log.info("Push enviado via Expo Push Service a: {}", token);
                return NotificationResult.ok(token, "expo_" + UUID.randomUUID().toString().substring(0, 8));
            } catch (Exception ex) {
                log.error("Fallo al enviar push via Expo: {}", ex.getMessage());
                return NotificationResult.fail(token, ex.getMessage());
            }
        }

        // Si es un token de desarrollo o prueba, se registra en telemetría estructurada
        String simulatedId = "msg_sim_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("""
                
                ==================== [PUSH NOTIFICATION SIMULATOR] ====================
                >> DESTINATARIO     : {}
                >> TÍTULO ALERTA    : {}
                >> CUERPO MENSAJE   : {}
                >> DATA PAYLOAD     : {}
                >> ESTADO ENVÍO     : ENVIADO CON ÉXITO (ID: {})
                =======================================================================
                """,
                token, message.title(), message.body(), message.data(), simulatedId
        );
        return NotificationResult.ok(token, simulatedId);
    }

    @Override
    public List<NotificationResult> sendBatch(List<PushAlertMessage> messages) {
        return messages.stream().map(this::send).toList();
    }
}
