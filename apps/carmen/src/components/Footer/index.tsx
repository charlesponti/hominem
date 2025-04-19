import { List as ListIcon, Mail, Search } from 'lucide-react'
import { DASHBOARD, INVITES, LISTS } from 'src/lib/routes'
import AppLink from '../AppLink'

const Footer = () => {
  return (
    <footer
      role="menu"
      className="visible md:hidden btm-nav z-[55] flex justify-between p-0 w-full"
    >
      <AppLink role="menuitem" to={DASHBOARD} className="p-4 flex-1 flex justify-center">
        <Search className="inline-block" size={24} />
      </AppLink>
      <AppLink role="menuitem" to={LISTS} className="p-4 flex-1 flex justify-center">
        <span className="inline-block relative">
          <ListIcon className="inline-block" />
        </span>
      </AppLink>
      <AppLink role="menuitem" to={INVITES} className="p-4 flex-1 flex justify-center">
        <Mail className="inline-block" />
      </AppLink>
    </footer>
  )
}

export default Footer
