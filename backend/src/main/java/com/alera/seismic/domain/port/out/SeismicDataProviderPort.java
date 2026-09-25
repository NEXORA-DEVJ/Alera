package com.alera.seismic.domain.port.out;

import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.model.SeismicSource;

import java.util.List;

public interface SeismicDataProviderPort {

    SeismicSource getSource();

    List<SeismicEvent> fetchRecentEvents();
}