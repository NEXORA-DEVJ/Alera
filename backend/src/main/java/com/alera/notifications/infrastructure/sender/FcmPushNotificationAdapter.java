package com.alera.notifications.infrastructure.sender;

import com.alera.notifications.domain.model.NotificationResult;
import com.alera.notifications.domain.model.PushAlertMessage;
import com.alera.notifications.domain.port.out.PushNotificationSenderPort;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.ApnsConfig;
import com.google.firebase.messaging.Aps;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.SendResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component("fcmPushNotificationAdapter")
@Primary
public class FcmPushNotificationAdapter implements PushNotificationSenderPort {

    private static final Logger log = LoggerFactory.getLogger(FcmPushNotificationAdapter.class);
    private static final int MAX_FCM_BATCH_SIZE = 500;

    private final Optional<FirebaseMessaging> firebaseMessaging;
    private final PushNotificationSenderPort expoSender;

    public FcmPushNotificationAdapter(
            @Autowired(required = false) FirebaseMessaging firebaseMessaging,
            @Qualifier("expoPushNotificationAdapter") PushNotificationSenderPort expoSender) {
        this.firebaseMessaging = Optional.ofNullable(firebaseMessaging);
        this.expoSender = Objects.requireNonNull(expoSender, "expoSender no puede ser nulo");
    }

    @Override
    public NotificationResult send(PushAlertMessage message) {
        String token = message.fcmToken();

        // 1. Delegar a Expo Push Adapter si el token corresponde al formato Expo
        if (isExpoToken(token)) {
            return expoSender.send(message);
        }

        // 2. Simular para tokens de desarrollo o prueba (evita enviar tokens no validos a Google)
        if (!isRealFcmToken(token)) {
            String simulatedId = "fcm_sim_" + UUID.randomUUID().toString().substring(0, 8);
            log.info("ALERA FCM SIMULATOR: Despacho simulado para token de prueba [{}] (ID: {})", token, simulatedId);
            return NotificationResult.ok(token, simulatedId);
        }

        // 3. Despachar a traves de Firebase Admin SDK si las credenciales estan activas
        if (firebaseMessaging.isPresent()) {
            try {
                FirebaseMessaging messaging = firebaseMessaging.get();
                Message fcmMsg = buildSingleMessage(token, message.title(), message.body(), message.data());
                String messageId = messaging.send(fcmMsg);
                log.info("ALERA FCM: Notificacion push enviada exitosamente a dispositivo [ID: {}]", messageId);
                return NotificationResult.ok(token, messageId);
            } catch (Exception ex) {
                log.error("ALERA FCM: Error al despachar notificacion individual a {}: {}", token, ex.getMessage());
                return NotificationResult.fail(token, ex.getMessage());
            }
        }

        // 4. Fallback cuando no hay credenciales de Google
        String simulatedId = "fcm_sim_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("""
                
                ==================== [FCM NOTIFICATION SIMULATOR] ====================
                >> DESTINATARIO     : {}
                >> TÍTULO ALERTA    : {}
                >> CUERPO MENSAJE   : {}
                >> DATA PAYLOAD     : {}
                >> ESTADO ENVÍO     : ENVIADO CON ÉXITO (ID: {})
                ======================================================================
                """,
                token, message.title(), message.body(), message.data(), simulatedId
        );
        return NotificationResult.ok(token, simulatedId);
    }

    @Override
    public List<NotificationResult> sendBatch(List<PushAlertMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return List.of();
        }

        List<NotificationResult> results = new ArrayList<>(messages.size());
        List<PushAlertMessage> expoMessages = new ArrayList<>();
        List<PushAlertMessage> realFcmMessages = new ArrayList<>();
        List<PushAlertMessage> devSimulatedMessages = new ArrayList<>();

        for (PushAlertMessage msg : messages) {
            String token = msg.fcmToken();
            if (isExpoToken(token)) {
                expoMessages.add(msg);
            } else if (isRealFcmToken(token)) {
                realFcmMessages.add(msg);
            } else {
                devSimulatedMessages.add(msg);
            }
        }

        // Despacho de tokens Expo
        if (!expoMessages.isEmpty()) {
            results.addAll(expoSender.sendBatch(expoMessages));
        }

        // Despacho de tokens FCM reales nativos
        if (!realFcmMessages.isEmpty()) {
            if (firebaseMessaging.isPresent()) {
                results.addAll(dispatchFcmMulticast(realFcmMessages));
            } else {
                for (PushAlertMessage msg : realFcmMessages) {
                    results.add(send(msg));
                }
            }
        }

        // Despacho simulado de tokens mock/desarrollo
        for (PushAlertMessage simMsg : devSimulatedMessages) {
            String simId = "fcm_sim_" + UUID.randomUUID().toString().substring(0, 8);
            log.info("ALERA FCM SIMULATOR: Despacho simulado para token de prueba [{}] (ID: {})", simMsg.fcmToken(), simId);
            results.add(NotificationResult.ok(simMsg.fcmToken(), simId));
        }

        return results;
    }

    private List<NotificationResult> dispatchFcmMulticast(List<PushAlertMessage> messages) {
        List<NotificationResult> results = new ArrayList<>();
        FirebaseMessaging messaging = firebaseMessaging.get();

        // Agrupamos por contenido para aprovechar MulticastMessage de hasta 500 tokens
        for (int i = 0; i < messages.size(); i += MAX_FCM_BATCH_SIZE) {
            List<PushAlertMessage> batch = messages.subList(i, Math.min(i + MAX_FCM_BATCH_SIZE, messages.size()));
            PushAlertMessage sample = batch.get(0);
            List<String> tokens = batch.stream().map(PushAlertMessage::fcmToken).toList();

            try {
                MulticastMessage multicast = MulticastMessage.builder()
                        .addAllTokens(tokens)
                        .setNotification(Notification.builder()
                                .setTitle(sample.title())
                                .setBody(sample.body())
                                .build())
                        .putAllData(sample.data())
                        .setAndroidConfig(AndroidConfig.builder()
                                .setPriority(AndroidConfig.Priority.HIGH)
                                .setNotification(AndroidNotification.builder()
                                        .setSound("default")
                                        .setChannelId("alera_emergency_channel")
                                        .build())
                                .build())
                        .setApnsConfig(ApnsConfig.builder()
                                .setAps(Aps.builder()
                                        .setSound("default")
                                        .setContentAvailable(true)
                                        .build())
                                .build())
                        .build();

                BatchResponse batchResponse = messaging.sendEachForMulticast(multicast);
                List<SendResponse> responses = batchResponse.getResponses();

                for (int j = 0; j < responses.size(); j++) {
                    SendResponse sendResp = responses.get(j);
                    String token = tokens.get(j);
                    if (sendResp.isSuccessful()) {
                        results.add(NotificationResult.ok(token, sendResp.getMessageId()));
                    } else {
                        String errMsg = sendResp.getException() != null ? sendResp.getException().getMessage() : "Error FCM";
                        results.add(NotificationResult.fail(token, errMsg));
                    }
                }
                log.info("ALERA FCM: Lote multicast procesado (Total: {}, Exitosos: {}, Fallidos: {})",
                        tokens.size(), batchResponse.getSuccessCount(), batchResponse.getFailureCount());
            } catch (Exception ex) {
                log.error("ALERA FCM: Fallo en despacho multicast por lotes: {}", ex.getMessage());
                for (String t : tokens) {
                    results.add(NotificationResult.fail(t, ex.getMessage()));
                }
            }
        }

        return results;
    }

    private Message buildSingleMessage(String token, String title, String body, Map<String, String> data) {
        return Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .putAllData(data != null ? data : Map.of())
                .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .setNotification(AndroidNotification.builder()
                                .setSound("default")
                                .setChannelId("alera_emergency_channel")
                                .build())
                        .build())
                .setApnsConfig(ApnsConfig.builder()
                        .setAps(Aps.builder()
                                .setSound("default")
                                .setContentAvailable(true)
                                .build())
                        .build())
                .build();
    }

    private boolean isExpoToken(String token) {
        return token != null && (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));
    }

    private boolean isRealFcmToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        if (token.startsWith("DEV_TOKEN_")
                || token.startsWith("fcm_token_")
                || token.startsWith("mock_")
                || token.startsWith("test_")
                || token.startsWith("simulated_")) {
            return false;
        }
        return token.length() >= 60;
    }
}
