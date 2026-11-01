import "./EggMoneyDiscountBanner.css";

const checkedAt = "2026.11.01 17:18";

const offers = [
    {
        market: "11번가",
        className: "egg-money-offer--11st",
        discountRate: 8,
        listPrice: 50000,
        salePrice: 46000,
        url: "https://www.11st.co.kr/products/9066457165",
    },
    {
        market: "G마켓",
        className: "egg-money-offer--gmarket",
        discountRate: 6,
        listPrice: 50000,
        salePrice: 46750,
        url: "https://item.gmarket.co.kr/Item?goodscode=4551552043",
    },
];

const won = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
});

export default function EggMoneyDiscountBanner() {
    return (
        <aside className="egg-money-discounts" aria-labelledby="egg-money-discounts-title">
            <div className="egg-money-discounts__intro">
                <div>
                    <span className="egg-money-discounts__eyebrow">에그머니 할인 현황</span>
                    <h2 id="egg-money-discounts-title">현재 두 판매처 모두 특가 적용 중</h2>
                    <p>에그머니는 상시 5%, 특가 기간에는 6~10% 할인됩니다.</p>
                </div>
                <span className="egg-money-discounts__checked">{checkedAt} 기준</span>
            </div>

            <div className="egg-money-discounts__bands" aria-label="에그머니 할인 구분">
                <span><b>상시 할인</b> 5%</span>
                <span className="egg-money-discounts__band-special"><b>특가 할인</b> 6~10%</span>
            </div>

            <div className="egg-money-discounts__offers">
                {offers.map((offer, index) => (
                    <a
                        className={`egg-money-offer ${offer.className}`}
                        href={offer.url}
                        key={offer.market}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${offer.market} 에그머니 5만원권 상품 보기`}
                    >
                        <span className="egg-money-offer__market">
                            <span className="egg-money-offer__special">특가</span>
                            {index === 0 && <span className="egg-money-offer__best">최저가</span>}
                            {offer.market}
                        </span>
                        <strong className="egg-money-offer__rate">{offer.discountRate}%</strong>
                        <span className="egg-money-offer__price">
                            <del>{won.format(offer.listPrice)}</del>
                            <b>{won.format(offer.salePrice)}</b>
                        </span>
                        <span className="egg-money-offer__link">상품 확인 →</span>
                    </a>
                ))}
            </div>

            <p className="egg-money-discounts__notice">
                현재 할인율은 대표 5만원권의 판매처 표시 기준이며, 회원·결제 조건이나 판매처 사정에 따라 바뀔 수 있습니다.
            </p>
        </aside>
    );
}
