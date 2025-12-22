import { FaArrowDown } from "react-icons/fa6";

export default function NextStep({size=150}) {
    return (
        <div className="row my-5">
            <div className="col">
                <FaArrowDown size={size}></FaArrowDown>
            </div>
        </div>
    )
}