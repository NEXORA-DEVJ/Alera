package com.alera.notifications.infrastructure.sender;

import com.alera.notifications.domain.model.NotificationResult;
import com.alera.notifications.domain.model.PushAlertMessage;
import com.alera.notifications.domain.port.out.PushNotificationSenderPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * @deprecated Obsoleto. La simulación y fallback están completamente integrados en FcmPushNotificationAdapter.
 */
@Deprecated
public class SimulatedPushNotificationAdapter implements PushNotificationSenderPort {

    private static final Logger log = LoggerFactory.getLogger(SimulatedPushNotificationAdapter.class);

    @Override
    public NotificationResult send(PushAlertMessage message) {
        String simulatedMessageId = "msg_sim_" + UUID.randomUUID().toString().substring(0, 8);

        log.info("""
                
                ==================== [PUSH NOTIFICATION SIMULATOR] ====================
                >> DESTINATARIO FCM : {}
                >> TÍTULO ALERTA    : {}
                >> CUERPO MENSAJE   : {}
                >> DATA PAYLOAD     : {}
                >> ESTADO ENVÍO     : ENVIADO CON ÉXITO (ID: {})
                =======================================================================
                """,
                message.fcmToken(),
                message.title(),
                message.body(),
                message.data(),
                simulatedMessageId
        );

        return NotificationResult.ok(message.fcmToken(), simulatedMessageId);
    }

    @Override
    public List<NotificationResult> sendBatch(List<PushAlertMessage> messages) {
        return messages.stream()
                .map(this::send)
                .toList();
    }
}