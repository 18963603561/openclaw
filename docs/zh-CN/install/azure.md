---
read_when:
    - 你希望在 Azure 上 24/7 运行 OpenClaw，并使用网络安全组进行加固时
    - 你希望在自己的 Azure Linux VM 上部署生产级、持续运行的 OpenClaw Gateway 网关时
    - 你希望通过 Azure Bastion SSH 进行安全管理时
summary: 在 Azure Linux VM 上 24/7 运行 OpenClaw Gateway 网关，并保持持久化状态
title: Azure
x-i18n:
    generated_at: "2026-04-08T05:59:51Z"
    model: gpt-5.4
    provider: openai
    source_hash: dcdcf6dcf5096cd21e1b64f455656f7d77b477d03e9a088db74c6e988c3031db
    source_path: install\azure.md
    workflow: 15
---

# 在 Azure Linux VM 上运行 OpenClaw

本指南将使用 Azure CLI 设置 Azure Linux VM，应用网络安全组（NSG）加固，配置 Azure Bastion 以提供 SSH 访问，并安装 OpenClaw。

## 你将执行的操作

- 使用 Azure CLI 创建 Azure 网络（VNet、子网、NSG）和计算资源
- 应用网络安全组规则，使 VM SSH 仅允许来自 Azure Bastion 的访问
- 使用 Azure Bastion 进行 SSH 访问（VM 不分配公共 IP）
- 使用安装脚本安装 OpenClaw
- 验证 Gateway 网关

## 你需要准备的内容

- 一个具有创建计算和网络资源权限的 Azure 订阅
- 已安装 Azure CLI（如有需要，请参阅 [Azure CLI 安装步骤](https://learn.microsoft.com/cli/azure/install-azure-cli)）
- 一对 SSH 密钥（如果你还没有，本指南也会介绍如何生成）
- 约 20-30 分钟

## 配置部署

<Steps>
  <Step title="登录 Azure CLI">
    ```bash
    az login
    az extension add -n ssh
    ```

    `ssh` 扩展是 Azure Bastion 原生 SSH 隧道所必需的。

  </Step>

  <Step title="注册所需的资源提供程序（一次性操作）">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    验证注册状态。等待两者都显示为 `Registered`。

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

  <Step title="设置部署变量">
    ```bash
    RG="rg-openclaw"
    LOCATION="westus2"
    VNET_NAME="vnet-openclaw"
    VNET_PREFIX="10.40.0.0/16"
    VM_SUBNET_NAME="snet-openclaw-vm"
    VM_SUBNET_PREFIX="10.40.2.0/24"
    BASTION_SUBNET_PREFIX="10.40.1.0/26"
    NSG_NAME="nsg-openclaw-vm"
    VM_NAME="vm-openclaw"
    ADMIN_USERNAME="openclaw"
    BASTION_NAME="bas-openclaw"
    BASTION_PIP_NAME="pip-openclaw-bastion"
    ```

    请根据你的环境调整名称和 CIDR 范围。Bastion 子网至少必须为 `/26`。

  </Step>

  <Step title="选择 SSH 密钥">
    如果你已有公钥，可直接使用：

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    如果你还没有 SSH 密钥，请生成一对：

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="选择 VM 规格和 OS 磁盘大小">
    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    请选择在你的订阅和区域中可用的 VM 规格与 OS 磁盘大小：

    - 轻量使用可先从较小规格开始，后续再扩容
    - 如果自动化更重、渠道更多，或模型/工具工作负载更大，请使用更多 vCPU/RAM/磁盘
    - 如果某个 VM 规格在你的区域中不可用，或超出了订阅配额，请选择最接近的可用 SKU

    列出目标区域可用的 VM 规格：

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    检查当前 vCPU 和磁盘使用量/配额：

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>
</Steps>

## 部署 Azure 资源

<Steps>
  <Step title="创建资源组">
    ```bash
    az group create -n "${RG}" -l "${LOCATION}"
    ```
  </Step>

  <Step title="创建网络安全组">
    创建 NSG，并添加规则，使只有 Bastion 子网可以通过 SSH 访问 VM。

    ```bash
    az network nsg create \
      -g "${RG}" -n "${NSG_NAME}" -l "${LOCATION}"

    # 仅允许来自 Bastion 子网的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n AllowSshFromBastionSubnet --priority 100 \
      --access Allow --direction Inbound --protocol Tcp \
      --source-address-prefixes "${BASTION_SUBNET_PREFIX}" \
      --destination-port-ranges 22

    # 拒绝来自公共互联网的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n DenyInternetSsh --priority 110 \
      --access Deny --direction Inbound --protocol Tcp \
      --source-address-prefixes Internet \
      --destination-port-ranges 22

    # 拒绝来自其他 VNet 源的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n DenyVnetSsh --priority 120 \
      --access Deny --direction Inbound --protocol Tcp \
      --source-address-prefixes VirtualNetwork \
      --destination-port-ranges 22
    ```

    这些规则按优先级进行评估（数字越小优先级越高）：优先级 100 允许 Bastion 流量，然后在 110 和 120 阻止所有其他 SSH 流量。

  </Step>

  <Step title="创建虚拟网络和子网">
    创建包含 VM 子网（附加 NSG）的 VNet，然后添加 Bastion 子网。

    ```bash
    az network vnet create \
      -g "${RG}" -n "${VNET_NAME}" -l "${LOCATION}" \
      --address-prefixes "${VNET_PREFIX}" \
      --subnet-name "${VM_SUBNET_NAME}" \
      --subnet-prefixes "${VM_SUBNET_PREFIX}"

    # 将 NSG 附加到 VM 子网
    az network vnet subnet update \
      -g "${RG}" --vnet-name "${VNET_NAME}" \
      -n "${VM_SUBNET_NAME}" --nsg "${NSG_NAME}"

    # AzureBastionSubnet —— Azure 要求必须使用这个名称
    az network vnet subnet create \
      -g "${RG}" --vnet-name "${VNET_NAME}" \
      -n AzureBastionSubnet \
      --address-prefixes "${BASTION_SUBNET_PREFIX}"
    ```

  </Step>

  <Step title="创建 VM">
    该 VM 没有公共 IP。SSH 访问仅通过 Azure Bastion 提供。

    ```bash
    az vm create \
      -g "${RG}" -n "${VM_NAME}" -l "${LOCATION}" \
      --image "Canonical:ubuntu-24_04-lts:server:latest" \
      --size "${VM_SIZE}" \
      --os-disk-size-gb "${OS_DISK_SIZE_GB}" \
      --storage-sku StandardSSD_LRS \
      --admin-username "${ADMIN_USERNAME}" \
      --ssh-key-values "${SSH_PUB_KEY}" \
      --vnet-name "${VNET_NAME}" \
      --subnet "${VM_SUBNET_NAME}" \
      --public-ip-address "" \
      --nsg ""
    ```

    `--public-ip-address ""` 可防止分配公共 IP。`--nsg ""` 会跳过创建基于 NIC 的独立 NSG（安全性由子网级 NSG 负责）。

    **可复现性：**上面的命令对 Ubuntu 镜像使用了 `latest`。如果你想固定为特定版本，请列出可用版本并替换 `latest`：

    ```bash
    az vm image list \
      --publisher Canonical --offer ubuntu-24_04-lts \
      --sku server --all -o table
    ```

  </Step>

  <Step title="创建 Azure Bastion">
    Azure Bastion 可在不暴露公共 IP 的情况下，为 VM 提供托管 SSH 访问。若要通过 CLI 使用 `az network bastion ssh`，则必须使用支持隧道的 Standard SKU。

    ```bash
    az network public-ip create \
      -g "${RG}" -n "${BASTION_PIP_NAME}" -l "${LOCATION}" \
      --sku Standard --allocation-method Static

    az network bastion create \
      -g "${RG}" -n "${BASTION_NAME}" -l "${LOCATION}" \
      --vnet-name "${VNET_NAME}" \
      --public-ip-address "${BASTION_PIP_NAME}" \
      --sku Standard --enable-tunneling true
    ```

    Bastion 的预配通常需要 5-10 分钟，但在某些区域可能需要 15-30 分钟。

  </Step>
</Steps>

## 安装 OpenClaw

<Steps>
  <Step title="通过 Azure Bastion SSH 登录 VM">
    ```bash
    VM_ID="$(az vm show -g "${RG}" -n "${VM_NAME}" --query id -o tsv)"

    az network bastion ssh \
      --name "${BASTION_NAME}" \
      --resource-group "${RG}" \
      --target-resource-id "${VM_ID}" \
      --auth-type ssh-key \
      --username "${ADMIN_USERNAME}" \
      --ssh-key ~/.ssh/id_ed25519
    ```

  </Step>

  <Step title="安装 OpenClaw（在 VM Shell 中执行）">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/install.sh
    bash /tmp/install.sh
    rm -f /tmp/install.sh
    ```

    如果系统中尚未安装，安装器会安装 Node LTS 和依赖项、安装 OpenClaw，并启动新手引导向导。详情见 [安装](/zh-CN/install)。

  </Step>

  <Step title="验证 Gateway 网关">
    当新手引导完成后：

    ```bash
    openclaw gateway status
    ```

    大多数 Azure 企业团队通常都已拥有 GitHub Copilot 许可证。如果你的情况也是如此，我们建议你在 OpenClaw 新手引导向导中选择 GitHub Copilot provider。参见 [GitHub Copilot provider](/zh-CN/providers/github-copilot)。

  </Step>
</Steps>

## 成本注意事项

Azure Bastion Standard SKU 的费用大约为**\$140/月**，而 VM（Standard_B2as_v2）的费用大约为**\$55/月**。

为降低成本：

- **不使用时释放 VM**（停止计算计费；磁盘费用仍会继续）。当 VM 被释放时，OpenClaw Gateway 网关将不可访问 —— 当你需要恢复在线时再重新启动：

  ```bash
  az vm deallocate -g "${RG}" -n "${VM_NAME}"
  az vm start -g "${RG}" -n "${VM_NAME}"   # 稍后重新启动
  ```

- **不需要时删除 Bastion**，并在需要 SSH 访问时重新创建。Bastion 是最大的成本项，而且通常只需几分钟即可重新预配。
- 如果你只需要基于 Portal 的 SSH，而不需要 CLI 隧道（`az network bastion ssh`），请使用 **Basic Bastion SKU**（约 **\$38/月**）。

## 清理

如需删除本指南创建的所有资源：

```bash
az group delete -n "${RG}" --yes --no-wait
```

这会删除该资源组及其中的所有内容（VM、VNet、NSG、Bastion、公共 IP）。

## 后续步骤

- 设置消息渠道：[渠道](/zh-CN/channels)
- 将本地设备配对为节点：[节点](/zh-CN/nodes)
- 配置 Gateway 网关：[??](/zh-CN/gateway/configuration)
- 有关使用 GitHub Copilot 模型 provider 在 Azure 上部署 OpenClaw 的更多细节，请参阅：[OpenClaw on Azure with GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)
