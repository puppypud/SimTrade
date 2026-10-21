package com.alpaca.web.Service;

import com.alpaca.web.dto.StockSearchDto;
import com.alpaca.web.entity.StockAsset;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * JPA Specification Builder สำหรับ Dynamic Filtering
 * สร้าง WHERE clause แบบ dynamic ตามเงื่อนไขที่หน้าบ้านส่งมา
 */
public class StockAssetSpecification {

    // Market Cap Tier ranges (หน่วย: ดอลลาร์)
    private static final Map<String, long[]> MARKET_CAP_RANGES = Map.of(
            "MEGA",  new long[]{200_000_000_000L, Long.MAX_VALUE},
            "LARGE", new long[]{10_000_000_000L, 200_000_000_000L},
            "MID",   new long[]{2_000_000_000L, 10_000_000_000L},
            "SMALL", new long[]{300_000_000L, 2_000_000_000L},
            "MICRO", new long[]{0L, 300_000_000L}
    );

    /**
     * สร้าง Specification จาก StockSearchDto ที่หน้าบ้านส่งมา
     * ทุกเงื่อนไขเป็น AND กัน (เป็น Optional — ถ้า null จะข้าม)
     */
    public static Specification<StockAsset> fromFilter(StockSearchDto filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // เงื่อนไขพื้นฐาน: ต้อง tradable เท่านั้น
            predicates.add(cb.isTrue(root.get("isTradable")));

            // 1. กรองตาม Keyword (symbol หรือ name)
            if (filter.getKeyword() != null && !filter.getKeyword().isBlank()) {
                String kw = "%" + filter.getKeyword().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("symbol")), kw),
                        cb.like(cb.lower(root.get("name")), kw)
                ));
            }

            // 2. กรองตาม Asset Type (US_EQUITY, CRYPTO)
            if (filter.getAssetTypes() != null && !filter.getAssetTypes().isEmpty()) {
                predicates.add(root.get("assetClass").in(filter.getAssetTypes()));
            }

            // 3. กรองตาม Sector/Industry
            if (filter.getSectors() != null && !filter.getSectors().isEmpty()) {
                predicates.add(root.get("industry").in(filter.getSectors()));
            }

            // 4. กรองตาม Category (STABLE, SWING, TRENDING, SPECULATIVE)
            if (filter.getCategories() != null && !filter.getCategories().isEmpty()) {
                predicates.add(root.get("category").in(filter.getCategories()));
            }

            // 5. กรองตาม Market Cap Tiers (MEGA, LARGE, MID, SMALL, MICRO)
            if (filter.getMarketCapTiers() != null && !filter.getMarketCapTiers().isEmpty()) {
                List<Predicate> capPredicates = new ArrayList<>();
                for (String tier : filter.getMarketCapTiers()) {
                    long[] range = MARKET_CAP_RANGES.get(tier.toUpperCase());
                    if (range != null) {
                        capPredicates.add(cb.and(
                                cb.greaterThanOrEqualTo(root.get("marketCap"), range[0]),
                                cb.lessThan(root.get("marketCap"), range[1])
                        ));
                    }
                }
                if (!capPredicates.isEmpty()) {
                    // OR ระหว่าง tiers (เช่น MEGA OR LARGE)
                    predicates.add(cb.or(capPredicates.toArray(new Predicate[0])));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
