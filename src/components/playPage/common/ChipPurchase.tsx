import { useState } from "react";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import { MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowUp } from "react-icons/md";

const ChipPurchase: React.FC = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [amount, setAmount] = useState<number>(280);
    const playableBalance = 702;
    const maxAmount = 280;

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 0 && value <= maxAmount) {
            setAmount(value);
        }
    };

    const handleBuy = () => {
        alert(`Purchased ${amount} chips!`);
    };

    return (
        <div className="absolute bottom-3 left-3 z-[0]">
            <div className="relative w-44">
                {/* Buy Chips Button */}
                <button
                    onClick={toggleDropdown}
                    className="w-full px-4 py-1 bg-[#101219] rounded-full text-white font-semibold flex items-center justify-between hover:bg-gray-600 transition duration-150"
                >
                    <RiMoneyDollarCircleLine />
                    <span>Buy chips</span>
                    <span className="text-xl">{isDropdownOpen ? <MdOutlineKeyboardArrowUp /> : <MdOutlineKeyboardArrowDown />}</span>
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                    <div className="absolute top-[-180px] left-0 w-full p-4 pb-8 bg-[#13151e] rounded-tr-2xl rounded-tl-2xl rounded-br-md rounded-bl-md text-white shadow-lg z-[-1]">
                        <div className="text-sm font-semibold mb-1">Playable balance</div>
                        <div className="text-2xl font-bold mb-2">{playableBalance}</div>

                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={handleAmountChange}
                                className="w-full px-3 py-1 text-center text-white bg-[#4e5056] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex text-white text-sm justify-end">Max. {maxAmount}</div>

                        <button
                            onClick={handleBuy}
                            className="w-full px-4 py-1 bg-gray-200 rounded-lg text-[#222] font-semibold hover:bg-gray-300 active:bg-gray-500 transition duration-150"
                        >
                            BUY
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChipPurchase;
