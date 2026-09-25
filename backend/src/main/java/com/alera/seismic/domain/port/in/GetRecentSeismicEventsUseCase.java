package com.alera.seismic.domain.port.in;

import com.alera.seismic.domain.model.SeismicEvent;

import java.util.List;

public interface GetRecentSeismicEventsUseCase {

    List<SeismicEvent> execute(int limit);
}