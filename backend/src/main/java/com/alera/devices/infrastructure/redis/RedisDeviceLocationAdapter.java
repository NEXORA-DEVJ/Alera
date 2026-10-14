package com.alera.devices.infrastructure.redis;

import com.alera.devices.domain.model.NearbyDeviceLocation;
import com.alera.devices.domain.port.out.DeviceLocationRepositoryPort;
import com.alera.shared.domain.Coordinates;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands.GeoLocation;
import org.springframework.data.redis.connection.RedisGeoCommands.GeoRadiusCommandArgs;
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

        Point point = new Point(coordinates.longitude(), coordinates.latitude());
        redisTemplate.opsForGeo().add(GEO_KEY, point, deviceIdStr);

        String presenceKey = PRESENCE_KEY_PREFIX + deviceIdStr;
        redisTemplate.opsForValue().set(presenceKey, "active", Duration.ofSeconds(ttlSeconds));
    }

    @Override
    public List<UUID> findDeviceIdsNearby(Coordinates center, double radiusKm) {
        return findNearbyDevicesWithDistance(center, radiusKm)
                .stream()
                .map(NearbyDeviceLocation::deviceId)
                .toList();
    }

    @Override
    public List<NearbyDeviceLocation> findNearbyDevicesWithDistance(Coordinates center, double radiusKm) {
        Point point = new Point(center.longitude(), center.latitude());
        Distance distance = new Distance(radiusKm, Metrics.KILOMETERS);
        Circle circle = new Circle(point, distance);

        GeoRadiusCommandArgs args = GeoRadiusCommandArgs.newGeoRadiusArgs()
                .includeDistance()
                .sortAscending();

        GeoResults<GeoLocation<String>> results = redisTemplate.opsForGeo().radius(GEO_KEY, circle, args);

        if (results == null || results.getContent().isEmpty()) {
            return List.of();
        }

        List<NearbyDeviceLocation> nearbyDevices = new ArrayList<>();
        for (GeoResult<GeoLocation<String>> result : results) {
            String deviceIdStr = result.getContent().getName();
            String presenceKey = PRESENCE_KEY_PREFIX + deviceIdStr;

            Boolean isAlive = redisTemplate.hasKey(presenceKey);
            if (Boolean.TRUE.equals(isAlive)) {
                try {
                    UUID id = UUID.fromString(deviceIdStr);
                    double distKm = Math.round(result.getDistance().getValue() * 10.0) / 10.0;
                    nearbyDevices.add(new NearbyDeviceLocation(id, distKm));
                } catch (IllegalArgumentException ignored) {
                }
            } else {
                // Limpieza perezosa en Redis si expiró el TTL
                redisTemplate.opsForZSet().remove(GEO_KEY, deviceIdStr);
            }
        }

        return nearbyDevices;
    }
}