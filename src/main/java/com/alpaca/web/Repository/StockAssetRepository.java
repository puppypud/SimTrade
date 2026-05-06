package com.alpaca.web.Repository;
import com.alpaca.web.entity.StockAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StockAssetRepository extends JpaRepository<StockAsset, String>, JpaSpecificationExecutor<StockAsset> {
    // หาหุ้นทั้งหมดที่ Admin ยังเปิดให้เทรดอยู่
    List<StockAsset> findByIsTradableTrue();
    // หาหุ้นตามหมวดหมู่
    List<StockAsset> findByCategory(String category);
    // ดึงหุ้น 3 ตัวที่ตรงกลุ่มหุ้นและตรงอุสหกรรม และไม่ซ้ำ
    List<StockAsset> findTop3ByCategoryAndIndustryAndSymbolNot(String category, String industry, String symbolToExclude);
    // ดึงหุ้น 5 ตัวตาม Category (ไม่จำกัด Industry) — ใช้แนะนำหุ้นเมื่อหาแบบเจาะจงไม่ได้
    List<StockAsset> findTop5ByCategoryAndIsTradableTrue(String category);

    // ดึงหุ้น 5 ตัวในอุตสาหกรรมเดียวกัน
    List<StockAsset> findTop5ByIndustryAndSymbolNot(String industry, String symbolToExclude);

    //ใช้หาข้อมูล ของ Hybrid Search พวกทำ fitter
    @Query("SELECT s FROM StockAsset s WHERE s.isTradable = true " +
            "AND (:keyword IS NULL OR LOWER(s.symbol) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%')) OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%'))) " +
            "AND (:category IS NULL OR s.category = :category) " +
            "AND (:industry IS NULL OR s.industry = :industry)")
    List<StockAsset> hybridSearchDb(
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("industry") String industry
    );
}
