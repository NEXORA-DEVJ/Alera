package com.alera.notifications.domain.port.in;

import com.alera.seismic.domain.model.SeismicEvent;

import java.util.UUID;

public interface DispatchSeismicAlertsUseCase {

    SeismicAlertDispatchResult dispatchForEvent(UUID seismicEventId);

    SeismicAlertDispatchResult dispatchForEvent(SeismicEvent seismicEvent);
}