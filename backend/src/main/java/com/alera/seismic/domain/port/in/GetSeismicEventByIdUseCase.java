package com.alera.seismic.domain.port.in;

import com.alera.seismic.domain.model.SeismicEvent;

import java.util.UUID;

public interface GetSeismicEventByIdUseCase {

    SeismicEvent execute(UUID id);
}