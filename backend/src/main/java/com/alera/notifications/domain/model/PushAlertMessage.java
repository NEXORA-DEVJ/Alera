package com.alera.notifications.domain.model;

import java.util.Map;
import java.util.Objects;

public record PushAlertMessage(
        String fcmToken,
        String title,
        String body,
        Map<String, String> data
) {
    public PushAlertMessage {
        Objects.requireNonNull(fcmToken, "fcmToken no puede ser nulo");
        Objects.requireNonNull(title, "title no puede ser nulo");
        Objects.requireNonNull(body, "body no puede ser nulo");
        data = (data == null) ? Map.of() : Map.copyOf(data);
    }
}