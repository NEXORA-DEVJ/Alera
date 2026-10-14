package com.alera.devices.infrastructure.redis;

import com.alera.devices.domain.port.out.DeviceLocationRepositoryPort;
import com.alera.shared.domain.Coordinates;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands.GeoLocation;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Repository
public class RedisDeviceLocationAdapter implements DeviceLocationRepositoryPort {

    private static final String GEO_KEY = "devices:locations:geo";
    private static final String PRESENCE_KEY_PREFIX = "device:presence:";

    private final StringRedisTemplate redisTemplate;

    public RedisDeviceLocationAdapter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = Objects.requireNonNull(redisTemplate, "StringRedisTemplate no puede ser nulo");
    }

    @Override
    public void saveLocation(UUID deviceId, Coordinates coordinates, long ttlSeconds) {
        String deviceIdStr = deviceId.toString();

        // 1. Guardar en el índice geoespacial de Redis (Point: x = longitud, y = latitud)
        Point point = new Point(coordinates.longitude(), coordinates.latitude());
        redisTemplate.opsForGeo().add(GEO_KEY, point, deviceIdStr);

        // 2. Guardar clave de presencia efímera con TTL para control de expiración
        String presenceKey = PRESENCE_KEY_PREFIX + deviceIdStr;
        redisTemplate.opsForValue().set(presenceKey, "active", Duration.ofSeconds(ttlSeconds));
    }

    @Override
    public List<UUID> findDeviceIdsNearby(Coordinates center, double radiusKm) {
        Point point = new Point(center.longitude(), center.latitude());
        Distance distance = new Distance(radiusKm, Metrics.KILOMETERS);
        Circle circle = new Circle(point, distance);

        GeoResults<GeoLocation<String>> results = redisTemplate.opsForGeo().radius(GEO_KEY, circle);

        if (results == null || results.getContent().isEmpty()) {
            return List.of();
        }

        List<UUID> nearbyDeviceIds = new ArrayList<>();
        for (GeoResult<GeoLocation<String>> result : results) {
            String deviceIdStr = result.getContent().getName();
            String presenceKey = PRESENCE_KEY_PREFIX + deviceIdStr;

            Boolean isAlive = redisTemplate.hasKey(presenceKey);
            if (Boolean.TRUE.equals(isAlive)) {
                try {
                    nearbyDeviceIds.add(UUID.fromString(deviceIdStr));
                } catch (IllegalArgumentException ignored) {
                    // Evitar fallos ante datos anómalos
                }
            } else {
                // Limpieza perezosa: el dispositivo expiró su TTL, lo retiramos del índice geoespacial
                redisTemplate.opsForZSet().remove(GEO_KEY, deviceIdStr);
            }
        }

        return nearbyDeviceIds;
    }
}