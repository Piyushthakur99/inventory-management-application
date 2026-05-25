package com.inventory.management.config;

import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.model.Product;
import com.inventory.management.repository.InventoryTransactionRepository;
import com.inventory.management.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.SplittableRandom;
import java.util.zip.CRC32;

@Component
public class DemoDemandSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDemandSeeder.class);

    private static final String DEMO_REFERENCE_ID = "DEMO_SEED";
    private static final int HISTORY_WINDOW_DAYS = 30;

    private final ProductRepository productRepository;
    private final InventoryTransactionRepository transactionRepository;

    @Value("${app.demo.seed-demand:true}")
    private boolean seedDemand;

    public DemoDemandSeeder(ProductRepository productRepository, InventoryTransactionRepository transactionRepository) {
        this.productRepository = productRepository;
        this.transactionRepository = transactionRepository;
    }

    @Override
    public void run(String... args) {
        if (!seedDemand) {
            log.info("Demo demand seeding disabled (app.demo.seed-demand=false)");
            return;
        }

        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(HISTORY_WINDOW_DAYS - 1L);
        LocalDateTime since = fromDate.atStartOfDay();

        // Avoid polluting real environments: only seed if there are no NON-demo transactions in the window.
        if (transactionRepository.existsByTransactionDateGreaterThanEqualAndTransactionTypeIgnoreCaseAndReferenceIdNot(
                since,
                "OUT",
                DEMO_REFERENCE_ID
        )) {
            log.info("Skipping demo demand seeding: recent non-demo OUT transactions exist in last {} days", HISTORY_WINDOW_DAYS);
            return;
        }

        long removed = transactionRepository.deleteByReferenceId(DEMO_REFERENCE_ID);

        List<Product> products = productRepository.findByActiveTrue();
        if (products == null || products.isEmpty()) {
            log.info("No active products found; demo demand seeding skipped");
            return;
        }

        List<InventoryTransaction> txs = new ArrayList<>();

        for (Product product : products) {
            if (product == null) continue;
            if (product.getId() == null || product.getId().isBlank()) continue;

            String productId = product.getId();
            String productName = (product.getName() == null || product.getName().isBlank()) ? "-" : product.getName();

            Profile profile = chooseProfile(productId);
            if (profile == Profile.ZERO) {
                continue;
            }

            Trend trend = chooseTrend(productId);

            for (int daysAgo = HISTORY_WINDOW_DAYS - 1; daysAgo >= 0; daysAgo--) {
                LocalDate date = today.minusDays(daysAgo);
                int i = HISTORY_WINDOW_DAYS - 1 - daysAgo; // oldest=0 .. newest=29
                int weekendPenalty = isWeekend(date) ? -1 : 0;

                int qty = quantityFor(productId, profile, trend, i, daysAgo, weekendPenalty);
                if (qty <= 0) continue;

                InventoryTransaction tx = new InventoryTransaction();
                tx.setProductId(productId);
                tx.setProductName(productName);
                tx.setTransactionType("OUT");
                tx.setQuantity(qty);
                tx.setPreviousQuantity(0);
                tx.setNewQuantity(0);
                tx.setReason("Demo seed for demand prediction");
                tx.setPerformedBy("seed-demo");
                tx.setReferenceId(DEMO_REFERENCE_ID);
                tx.setTransactionDate(LocalDateTime.of(date, LocalTime.NOON));

                txs.add(tx);
            }
        }

        if (!txs.isEmpty()) {
            transactionRepository.saveAll(txs);
        }

        log.info("Demo demand seed complete: removed {} old txs, inserted {} new txs (referenceId={})", removed, txs.size(), DEMO_REFERENCE_ID);
    }

    private boolean isWeekend(LocalDate date) {
        int dow = date.getDayOfWeek().getValue();
        return dow == 6 || dow == 7;
    }

    private enum Profile {
        FAST,
        MED,
        LOW,
        RARE,
        ZERO
    }

    private enum Trend {
        UP,
        DOWN,
        FLAT
    }

    private Profile chooseProfile(String productId) {
        double r = rand01("PROFILE|" + productId);
        // distribution: ~20% fast, ~35% medium, ~30% low, ~10% rare, ~5% zero
        if (r < 0.20) return Profile.FAST;
        if (r < 0.55) return Profile.MED;
        if (r < 0.85) return Profile.LOW;
        if (r < 0.95) return Profile.RARE;
        return Profile.ZERO;
    }

    private Trend chooseTrend(String productId) {
        double t = rand01("TREND|" + productId);
        if (t < 0.34) return Trend.UP;
        if (t < 0.68) return Trend.DOWN;
        return Trend.FLAT;
    }

    private int quantityFor(String productId, Profile profile, Trend trend, int i, int daysAgo, int weekendPenalty) {
        double mult = switch (trend) {
            case UP -> trendUp(i);
            case DOWN -> trendDown(i);
            case FLAT -> 1.0;
        };

        return switch (profile) {
            case FAST -> {
                int base = randInt("FAST|base|" + productId, 4, 7);
                int noise = randInt("FAST|noise|" + productId + "|" + daysAgo, -1, 2);
                int q = clampInt((int) Math.round(base * mult + weekendPenalty + noise), 0, 14);
                yield q;
            }
            case MED -> {
                int base = randInt("MED|base|" + productId, 2, 4);
                int noise = randInt("MED|noise|" + productId + "|" + daysAgo, -1, 1);
                int q = clampInt((int) Math.round(base * mult + noise), 0, 8);
                yield q;
            }
            case LOW -> {
                boolean hasUsage = rand01("LOW|has|" + productId + "|" + daysAgo) > 0.45;
                if (!hasUsage) yield 0;
                int extra = rand01("LOW|extra|" + productId + "|" + daysAgo) > 0.85 ? 1 : 0;
                int q = clampInt((int) Math.round((1 + extra) * mult), 0, 4);
                yield q;
            }
            case RARE -> {
                boolean spike = rand01("RARE|spike|" + productId + "|" + daysAgo) > 0.93;
                if (!spike) yield 0;
                int q = clampInt(randInt("RARE|qty|" + productId + "|" + daysAgo, 1, 3), 1, 4);
                yield q;
            }
            case ZERO -> 0;
        };
    }

    private double trendUp(int i) {
        return 0.75 + (i / 29.0) * 0.60; // 0.75 .. 1.35
    }

    private double trendDown(int i) {
        return 1.35 - (i / 29.0) * 0.60; // 1.35 .. 0.75
    }

    private int clampInt(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    private double rand01(String key) {
        // Stable across runs and JVMs
        long seed = hashToLong(key.toUpperCase(Locale.ROOT));
        return new SplittableRandom(seed).nextDouble();
    }

    private int randInt(String key, int min, int max) {
        if (max < min) return min;
        long seed = hashToLong(key.toUpperCase(Locale.ROOT));
        return new SplittableRandom(seed).nextInt(min, max + 1);
    }

    private long hashToLong(String s) {
        CRC32 crc = new CRC32();
        crc.update(s.getBytes(StandardCharsets.UTF_8));
        return crc.getValue();
    }
}
