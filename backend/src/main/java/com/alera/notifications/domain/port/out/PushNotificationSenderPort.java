package com.alera.notifications.domain.port.out;

import com.alera.notifications.domain.model.NotificationResult;
import com.alera.notifications.domain.model.PushAlertMessage;

import java.util.List;

public interface PushNotificationSenderPort {

    NotificationResult send(PushAlertMessage message);

    List<NotificationResult> sendBatch(List<PushAlertMessage> messages);
}