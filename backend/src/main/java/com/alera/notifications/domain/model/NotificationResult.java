package com.alera.notifications.domain.model;

public record NotificationResult(
        String fcmToken,
        boolean success,
        String messageId,
        String errorMessage
) {
    public static NotificationResult ok(String fcmToken, String messageId) {
        return new NotificationResult(fcmToken, true, messageId, null);
    }

    public static NotificationResult fail(String fcmToken, String errorMessage) {
        return new NotificationResult(fcmToken, false, null, errorMessage);
    }
}