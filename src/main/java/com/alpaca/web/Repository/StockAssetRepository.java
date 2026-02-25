package com.alpaca.web.Repository;
import com.alpaca.web.entity.StockAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StockAssetRepository extends JpaRepository<StockAsset, String> {
    // หาหุ้นทั้งหมดที่ Admin ยังเปิดให้เทรดอยู่
    List<StockAsset> findByIsTradableTrue();
    // หาหุ้นตามหมวดหมู่
    List<StockAsset> findByCategory(String category);
}
